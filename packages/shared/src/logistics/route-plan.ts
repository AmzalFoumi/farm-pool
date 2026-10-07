import { distanceKm, type GeoPoint } from "../geo/point";
import type { CollectionWindow } from "./collection-window";

/**
 * Can a driver actually keep all the promises they have made, and in what order (FARM-61)?
 *
 * FARM-61 established that a collection time given to a farmer is a commitment. This file answers
 * the question that follows: *given the promises already made, can one more be kept?* Overlap
 * alone was never enough — two windows an hour apart and 60 km apart do not overlap and are still
 * impossible, and a driver who accepts both lets one farmer down.
 *
 * TWO THINGS DECIDE THE ORDER, not one.
 *
 * - **Time is the constraint.** A window is a promise, so the route follows the promises rather
 *   than reordering them for efficiency. Optimising a 10 am pickup ahead of an 8 am one because
 *   it is nearer would break exactly what FARM-61 protects.
 * - **Distance is the tie-break.** Where two stops leave genuine freedom — overlapping windows, or
 *   an older listing carrying none — the nearer one goes first, which is the sensible drive.
 *
 * WHY THIS IS A FILTER AND NOT A BUTTON. `canInsert` is meant to run over the whole open board in
 * one pass, so a driver is only shown work that genuinely fits their day. Finding out by tapping
 * each job and being refused is the same information delivered as a series of small failures.
 */

/**
 * How much longer a real road is than the straight line between two points.
 *
 * A guess, and labelled as one: 1.5 is a common figure for hilly, winding terrain, which describes
 * most of the island away from the coastal strip. It exists so that every estimate here is
 * *pessimistic rather than flattering* — a route the planner calls feasible should still be
 * feasible on tarmac. Replace the whole estimate with a real routing API before anyone is paid or
 * penalised against it.
 */
export const ROAD_FACTOR = 1.5;

/** A loaded lorry on mixed rural and main road. Deliberately conservative for the same reason. */
export const AVERAGE_SPEED_KMH = 35;

/** Fixed minutes at a gate — finding the farmer, backing up, paperwork — before anything is lifted. */
export const STOP_BASE_MINUTES = 15;

/** Hand-loading time. 100 kg of produce into a lorry is roughly a minute of two people working. */
export const MINUTES_PER_100KG = 1;

/** Driving minutes between two points, by the straight line and the assumptions above. */
export function travelMinutes(from: GeoPoint, to: GeoPoint): number {
  const roadKm = distanceKm(from, to) * ROAD_FACTOR;
  return Math.round((roadKm / AVERAGE_SPEED_KMH) * 60);
}

/** Minutes spent at a stop loading `quantityKg`. */
export function serviceMinutes(quantityKg: number): number {
  return STOP_BASE_MINUTES + Math.round((quantityKg / 100) * MINUTES_PER_100KG);
}

/** One place the driver must be, and when they promised to be there. */
export type RouteStop = {
  /** The order this stop belongs to. */
  id: string;
  point: GeoPoint;
  quantityKg: number;
  /** What the driver promised the farmer. Absent on jobs taken before windows existed. */
  window?: CollectionWindow;
};

/** A stop placed in the plan, with when the driver is expected to reach it. */
export type PlannedStop = RouteStop & {
  /** 1-based, so it reads the way the screen numbers them. */
  position: number;
  /** Estimated arrival, minutes from midnight. */
  arrivalMinutes: number;
  /** Minutes to spare against the promised window's end. Negative means the promise is broken. */
  slackMinutes?: number;
  /** Driving minutes from the previous stop; 0 for the first. */
  legMinutes: number;
};

export type RoutePlan = {
  stops: PlannedStop[];
  /** True when every promised window is still kept. */
  feasible: boolean;
  totalKm: number;
  totalMinutes: number;
  /** The tightest slack across the route — what breaks first if anything slips. */
  tightestSlackMinutes?: number;
};

/**
 * Order the stops and work out when the driver reaches each.
 *
 * Ordering is by promised start, with distance from the previous stop as the tie-break — so a day
 * with firm promises follows the promises, and a day with loose ones drives sensibly. Stops with
 * no window at all sort last: they are the flexible ones, and putting them around fixed promises
 * is the only way the fixed ones stay kept.
 *
 * Arrival is "whichever is later: the time you could get there, or the time the window opens" —
 * a driver who arrives at 7:40 for an 8:00 window waits, and that wait is real time that pushes
 * nothing later because the next leg starts from the window, not from the arrival.
 */
export function planRoute(stops: readonly RouteStop[], startAt?: GeoPoint): RoutePlan {
  const ordered = orderStops(stops, startAt);

  const planned: PlannedStop[] = [];
  let clock = ordered[0]?.window?.from ?? 0;
  let totalKm = 0;
  let previous = startAt;

  for (const [index, stop] of ordered.entries()) {
    const legMinutes = previous ? travelMinutes(previous, stop.point) : 0;
    if (previous) totalKm += distanceKm(previous, stop.point) * ROAD_FACTOR;

    const couldArrive = clock + legMinutes;
    /* Arriving before the window opens is waiting, not lateness — the driver sits at the gate.
       Taking the max is what stops an early first stop making every later one look early too. */
    const arrivalMinutes = stop.window ? Math.max(couldArrive, stop.window.from) : couldArrive;

    planned.push({
      ...stop,
      position: index + 1,
      arrivalMinutes,
      legMinutes,
      ...(stop.window ? { slackMinutes: stop.window.to - arrivalMinutes } : {})
    });

    clock = arrivalMinutes + serviceMinutes(stop.quantityKg);
    previous = stop.point;
  }

  const slacks = planned.map((s) => s.slackMinutes).filter((s): s is number => s !== undefined);

  return {
    stops: planned,
    feasible: slacks.every((s) => s >= 0),
    totalKm: Math.round(totalKm * 10) / 10,
    totalMinutes: planned.length ? clock - (planned[0].arrivalMinutes - planned[0].legMinutes) : 0,
    ...(slacks.length ? { tightestSlackMinutes: Math.min(...slacks) } : {})
  };
}

/**
 * Time first, distance second — see the header for why that order and not the reverse.
 *
 * The distance tie-break chains from the stop *before* it rather than from a fixed anchor: once
 * the driver is at stop 2, "nearest" means nearest to stop 2. Measuring every tie from the start
 * point would pick the stop closest to where the day began, which stops being the right answer
 * the moment they drive anywhere.
 */
function orderStops(stops: readonly RouteStop[], startAt?: GeoPoint): RouteStop[] {
  const withWindow = [...stops.filter((s) => s.window !== undefined)];
  const withoutWindow = stops.filter((s) => s.window === undefined);

  /* Grouped by promised start, so ties are resolved within a group and the groups stay in
     promise order — a later promise can never be pulled in front of an earlier one. */
  withWindow.sort((a, b) => {
    const byDate = (a.window?.date ?? "").localeCompare(b.window?.date ?? "");
    if (byDate !== 0) return byDate;
    return (a.window?.from ?? 0) - (b.window?.from ?? 0);
  });

  const chained: RouteStop[] = [];
  let at = startAt;
  let i = 0;
  while (i < withWindow.length) {
    /* Everything promised for the same moment: nothing in the promises separates them, so the
       driving decides. */
    const tied = [withWindow[i]];
    while (
      i + tied.length < withWindow.length &&
      withWindow[i + tied.length].window?.date === tied[0].window?.date &&
      withWindow[i + tied.length].window?.from === tied[0].window?.from
    ) {
      tied.push(withWindow[i + tied.length]);
    }
    const ordered = tied.length > 1 ? nearestFirst(tied, at) : tied;
    chained.push(...ordered);
    at = ordered.at(-1)?.point ?? at;
    i += tied.length;
  }

  /* The windowless ones go last, where they cannot displace a promise, chained nearest-first from
     wherever the promised work ends — nothing constrains them but the driving. */
  return [...chained, ...nearestFirst(withoutWindow, at)];
}

/** Greedy nearest-neighbour. Good enough for the handful of stops one lorry does in a day. */
function nearestFirst(stops: readonly RouteStop[], from?: GeoPoint): RouteStop[] {
  if (!from || stops.length < 2) return [...stops];
  const remaining = [...stops];
  const chained: RouteStop[] = [];
  let at = from;
  while (remaining.length > 0) {
    let nearest = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (distanceKm(at, remaining[i].point) < distanceKm(at, remaining[nearest].point)) {
        nearest = i;
      }
    }
    const [next] = remaining.splice(nearest, 1);
    chained.push(next);
    at = next.point;
  }
  return chained;
}

/**
 * Could the driver take this job without breaking a promise they have already made?
 *
 * Returns the plan they would be on if they did, or `null` if no arrangement works. Used two ways,
 * and the second is the point: once when a driver taps Accept, and once per open job when the
 * board is built — so the board only ever offers work that genuinely fits the day.
 *
 * When the candidate carries a window the driver has not committed to yet, every slot inside the
 * farmer's offered window is tried, because committing to the earliest is not the same as
 * committing to the only one that fits.
 */
export function canInsert(
  held: readonly RouteStop[],
  candidate: RouteStop,
  startAt?: GeoPoint
): RoutePlan | null {
  const plan = planRoute([...held, candidate], startAt);
  return plan.feasible ? plan : null;
}

/** Every whole slot of `length` inside an offered window — what a driver may actually promise. */
export function slotsWithin(offered: CollectionWindow, length: number): CollectionWindow[] {
  const slots: CollectionWindow[] = [];
  for (let from = offered.from; from + length <= offered.to; from += length) {
    slots.push({ date: offered.date, from, to: from + length });
  }
  return slots;
}

/**
 * The earliest slot inside `offered` the driver could promise and still keep everything else.
 *
 * This is what lets the board answer "can I take this?" without the driver choosing a time first:
 * if *some* slot works the job is offered, and the picker then shows only the slots that do.
 */
export function firstFeasibleSlot(
  held: readonly RouteStop[],
  candidate: Omit<RouteStop, "window">,
  offered: CollectionWindow,
  slotLength: number,
  startAt?: GeoPoint
): CollectionWindow | null {
  for (const slot of slotsWithin(offered, slotLength)) {
    if (canInsert(held, { ...candidate, window: slot }, startAt)) return slot;
  }
  return null;
}
