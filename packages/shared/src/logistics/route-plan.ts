import { distanceKm, type GeoPoint } from "../geo/point";
import type { CollectionWindow } from "./collection-window";

/**
 * Can a driver actually keep all the promises they have made, and in what order (FARM-61)?
 *
 * FARM-61 established that a collection time given to a farmer is a commitment. This file answers
 * the question that follows: *given the promises already made, can one more be kept — and what is
 * the shortest day that keeps them all?* Overlap alone was never enough: two windows an hour apart
 * and 60 km apart do not overlap and are still impossible, and a driver who accepts both lets one
 * farmer down.
 *
 * **THE PROMISE IS THE WINDOW, NOT THE ORDER.** This replaced an earlier rule that sorted stops by
 * when their window *opened* and called distance a tie-break. That was wrong twice over, and both
 * were measured before it was changed:
 *
 * - **It sorted on the wrong field.** Feasibility here is `arrival <= window.to` — the deadline.
 *   Ordering by `window.from` is ordering by release time, which is not the constraint. A farmer
 *   promised 08:00–12:00 and collected at 11:00 has had their promise kept; nothing about the
 *   order was ever promised to them.
 * - **It cost real driving.** Kurunegala 08:00–17:00 and Gampaha 08:30–17:00, starting from
 *   Colombo, planned 215.3 km. The other order keeps both promises and drives 124.8 km.
 *
 * So the rule is now: **of every ordering that keeps every promise, take the shortest.** Time is
 * still the constraint — nothing below will return a plan that misses a window — but distance is
 * what the search minimises rather than what it falls back on.
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

/**
 * Above this many stops the planner stops searching every ordering and takes the greedy one.
 *
 * Eight is where the exhaustive search stays comfortably inside a few milliseconds even before
 * pruning, and a lorry-day of more than eight collections is not a day anyone is planning. The
 * fallback is not a failure mode — it returns a sound, feasible plan, just not a provably shortest
 * one — but it is a silent change in guarantee, which is why `exhaustive` on the returned plan
 * says which one the caller got.
 */
export const EXACT_SEARCH_LIMIT = 8;

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
  /**
   * Whether every ordering was examined, or the greedy one was taken.
   *
   * False means the plan is feasible and sensible but not provably the shortest — see
   * `EXACT_SEARCH_LIMIT`. Exposed rather than hidden because "we stopped looking" is exactly the
   * kind of thing that should never be invisible to the thing deciding what to show a driver.
   */
  exhaustive: boolean;
};

/**
 * A clock value far enough before any real time that `Math.max` with a window always wins.
 *
 * Needed because a route may open with stops that carry no window at all. Those have no release
 * time, so there is nothing to start the clock at — the driver leaves early enough to reach the
 * first *promise* on time, and the windowless stops before it are fitted into that run-up. Starting
 * the clock at the first promise instead would have made any windowless stop placed before it
 * infeasible, which is how the old "windowless stops go last" rule came about. It is not a rule,
 * it was an artefact.
 */
const UNSET_CLOCK = -100_000;

/**
 * Order the stops and work out when the driver reaches each.
 *
 * Of every ordering that keeps every promise, this returns the one with the least driving. Where
 * no ordering keeps them all, it returns the least-bad one it found so the caller can see *what*
 * breaks — `feasible` is false and the slack on the offending stop is negative.
 *
 * Arrival is "whichever is later: the time you could get there, or the time the window opens" —
 * a driver who arrives at 7:40 for an 8:00 window waits, and that wait is real time that pushes
 * everything after it later.
 */
export function planRoute(stops: readonly RouteStop[], startAt?: GeoPoint): RoutePlan {
  if (stops.length === 0) {
    return { stops: [], feasible: true, totalKm: 0, totalMinutes: 0, exhaustive: true };
  }

  const exhaustive = stops.length <= EXACT_SEARCH_LIMIT;
  const greedy = greedyOrder(stops, startAt);
  const ordered = exhaustive ? shortestFeasibleOrder(stops, startAt, greedy) : greedy;

  return { ...schedule(ordered, startAt), exhaustive };
}

/**
 * Walk one ordering and say when the driver reaches each stop.
 *
 * Split out from the ordering because the search below runs it thousands of times, and because a
 * caller holding an order it wants to keep — `canInsert` does — needs to price that order rather
 * than have it rearranged underneath them.
 */
function schedule(
  ordered: readonly RouteStop[],
  startAt?: GeoPoint
): Omit<RoutePlan, "exhaustive"> {
  const planned: PlannedStop[] = [];
  const anyWindow = ordered.some((s) => s.window !== undefined);
  let clock = anyWindow ? UNSET_CLOCK : 0;
  let totalKm = 0;
  let previous = startAt;

  for (const [index, stop] of ordered.entries()) {
    const legMinutes = previous ? travelMinutes(previous, stop.point) : 0;
    if (previous) totalKm += distanceKm(previous, stop.point) * ROAD_FACTOR;

    const couldArrive = clock + legMinutes;
    /* Arriving before the window opens is waiting, not lateness — the driver sits at the gate.
       Taking the max is also what pins the clock for the first promised stop, and everything
       after it is then absolute. */
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

  /* Any stops before the first promise were walked with the sentinel clock, so their arrivals are
     nonsense. Fill them in backwards from the first real arrival: the day starts early enough to
     do them and still reach the promise on time, which is what a driver would actually do. */
  backfillLeadingArrivals(planned);

  const slacks = planned.map((s) => s.slackMinutes).filter((s): s is number => s !== undefined);
  const first = planned[0];

  return {
    stops: planned,
    feasible: slacks.every((s) => s >= 0),
    totalKm: Math.round(totalKm * 10) / 10,
    totalMinutes: first ? clock - (first.arrivalMinutes - first.legMinutes) : 0,
    ...(slacks.length ? { tightestSlackMinutes: Math.min(...slacks) } : {})
  };
}

/** Walk back from the first promised stop, giving the windowless stops before it real times. */
function backfillLeadingArrivals(planned: PlannedStop[]): void {
  const firstPromised = planned.findIndex((s) => s.window !== undefined);
  if (firstPromised <= 0) return;

  for (let i = firstPromised - 1; i >= 0; i--) {
    const next = planned[i + 1];
    planned[i].arrivalMinutes =
      next.arrivalMinutes - next.legMinutes - serviceMinutes(planned[i].quantityKg);
  }
}

/**
 * Of every ordering that keeps every promise, the one with the least driving.
 *
 * Depth-first over the permutations, with two prunes that between them make the search finish long
 * before `n!` on anything realistic: a branch dies the moment its driving exceeds the best complete
 * route already found, and the moment a stop is reached after its window has closed. The greedy
 * order is handed in as the opening bound, so the first prune has something to bite on immediately
 * rather than after the first full permutation.
 *
 * Falls back to the greedy order when nothing is feasible, so the caller still gets a plan to show
 * and `feasible` carries the bad news rather than an empty route.
 */
function shortestFeasibleOrder(
  stops: readonly RouteStop[],
  startAt: GeoPoint | undefined,
  greedy: readonly RouteStop[]
): readonly RouteStop[] {
  const anyWindow = stops.some((s) => s.window !== undefined);
  const greedyPlan = schedule(greedy, startAt);

  let best: readonly RouteStop[] | null = greedyPlan.feasible ? greedy : null;
  let bestKm = greedyPlan.feasible ? greedyPlan.totalKm : Infinity;

  const chosen: RouteStop[] = [];
  const taken = stops.map(() => false);

  const walk = (at: GeoPoint | undefined, clock: number, km: number): void => {
    if (km >= bestKm) return;

    if (chosen.length === stops.length) {
      best = [...chosen];
      bestKm = km;
      return;
    }

    for (const [index, stop] of stops.entries()) {
      if (taken[index]) continue;

      const leg = at ? travelMinutes(at, stop.point) : 0;
      const nextKm = km + (at ? distanceKm(at, stop.point) * ROAD_FACTOR : 0);
      if (nextKm >= bestKm) continue;

      const arrival = stop.window ? Math.max(clock + leg, stop.window.from) : clock + leg;
      /* The promise this stop carries, broken. No ordering that starts this way can recover it,
         because every stop after it only pushes later. */
      if (stop.window && arrival > stop.window.to) continue;

      taken[index] = true;
      chosen.push(stop);
      walk(stop.point, arrival + serviceMinutes(stop.quantityKg), nextKm);
      chosen.pop();
      taken[index] = false;
    }
  };

  walk(startAt, anyWindow ? UNSET_CLOCK : 0, 0);

  return best ?? greedy;
}

/**
 * Earliest deadline first, with the nearest stop breaking ties.
 *
 * The opening bound for the search above, and the whole answer past `EXACT_SEARCH_LIMIT`. Deadline
 * rather than window start because the deadline is the constraint — sorting by when a window opens
 * is what this file used to do, and it is the thing that both lengthened routes and hid feasible
 * work from the board.
 *
 * Stops with no window sort last *within the greedy only*, as a tie-break of convenience: they have
 * no deadline, so nothing orders them against a promise. The search is free to place them anywhere,
 * and usually does.
 */
function greedyOrder(stops: readonly RouteStop[], startAt?: GeoPoint): readonly RouteStop[] {
  const deadline = (s: RouteStop) =>
    s.window ? dayMinutes(s.window.date) + s.window.to : Number.MAX_SAFE_INTEGER;

  const remaining = [...stops];
  const chained: RouteStop[] = [];
  let at = startAt;

  while (remaining.length > 0) {
    const soonest = Math.min(...remaining.map(deadline));
    /* Everything sharing the soonest deadline is equally urgent, so the driving decides. */
    const due = remaining.filter((s) => deadline(s) === soonest);
    const next = at
      ? due.reduce((best, s) =>
          distanceKm(at as GeoPoint, s.point) < distanceKm(at as GeoPoint, best.point) ? s : best
        )
      : due[0];

    chained.push(next);
    remaining.splice(remaining.indexOf(next), 1);
    at = next.point;
  }

  return chained;
}

/**
 * A date as minutes, so a window's deadline can be compared across days.
 *
 * `CollectionWindow.from`/`.to` are minutes from midnight, which say nothing about which midnight.
 * Without this, a 09:00 deadline tomorrow sorts ahead of a 17:00 one today.
 */
function dayMinutes(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 60_000;
}

/**
 * Could the driver take this job without breaking a promise they have already made?
 *
 * Returns the plan they would be on if they did, or `null` if no ordering works. It really does
 * mean no ordering now — it used to build one ordering and test that, which rejected work that
 * fitted: a held job in Kandy promised 09:00–17:00 and a new one in Colombo promised 10:00–10:30
 * came back `null`, while doing Colombo first keeps both with 30 and 158 minutes to spare and
 * drives half as far.
 *
 * Used two ways, and the second is the point: once when a driver taps Accept, and once per open job
 * when the board is built — so the board only ever offers work that genuinely fits the day.
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
