import {
  canInsert,
  firstFeasibleSlot,
  planRoute,
  serviceMinutes,
  slotsWithin,
  travelMinutes,
  type RouteStop,
} from '@farm-pool/shared';

/**
 * The route planner (FARM-61). Pure logic, no repositories — which is why it is worth testing
 * hard: every rule the board and the accept check depend on is decided here.
 *
 * Places are real, so the distances are sane to reason about: Wariyapola to Kurunegala is ~25 km
 * by road, Kurunegala to Colombo ~95 km.
 */
const WARIYAPOLA = { latitude: 7.6281, longitude: 80.2447 };
const KURUNEGALA = { latitude: 7.4863, longitude: 80.3647 };
const COLOMBO = { latitude: 6.9271, longitude: 79.8612 };
const JAFFNA = { latitude: 9.6615, longitude: 80.0255 };

const DAY = '2026-11-12';
const at = (h: number, m = 0) => h * 60 + m;
const window = (from: number, to: number) => ({ date: DAY, from, to });

const stop = (
  id: string,
  point: { latitude: number; longitude: number },
  w?: { date: string; from: number; to: number },
  quantityKg = 200,
): RouteStop => ({ id, point, quantityKg, ...(w ? { window: w } : {}) });

describe('travel and service estimates', () => {
  it('is pessimistic rather than flattering, so a feasible plan stays feasible on tarmac', () => {
    const minutes = travelMinutes(WARIYAPOLA, KURUNEGALA);

    // ~19 km straight line; the road factor makes it ~29 km, ~50 min at 35 km/h.
    expect(minutes).toBeGreaterThan(40);
    expect(minutes).toBeLessThan(60);
  });

  it('charges more for a heavier load, because hand-loading is the slow part', () => {
    expect(serviceMinutes(1000)).toBeGreaterThan(serviceMinutes(100));
  });
});

describe('ordering', () => {
  /* Time is the constraint, not distance. Reordering a promise for efficiency would break exactly
     what FARM-61 exists to protect. */
  it('follows the promises even when a later one is nearer', () => {
    const far = stop('far', COLOMBO, window(at(6), at(8)));
    const near = stop('near', KURUNEGALA, window(at(14), at(16)));

    const plan = planRoute([near, far], KURUNEGALA);

    expect(plan.stops.map((s) => s.id)).toEqual(['far', 'near']);
  });

  /* Distance decides only where the promise leaves it open. */
  it('takes the nearer stop first when two share a promised start', () => {
    const near = stop('near', KURUNEGALA, window(at(6), at(10)));
    const far = stop('far', COLOMBO, window(at(6), at(10)));

    const plan = planRoute([far, near], KURUNEGALA);

    expect(plan.stops[0].id).toBe('near');
  });

  it('puts stops with no promised window last, where they cannot displace one', () => {
    const loose = stop('loose', KURUNEGALA);
    const promised = stop('promised', COLOMBO, window(at(14), at(16)));

    const plan = planRoute([loose, promised], KURUNEGALA);

    expect(plan.stops.map((s) => s.id)).toEqual(['promised', 'loose']);
  });

  it('chains windowless stops nearest-first', () => {
    const plan = planRoute(
      [
        stop('jaffna', JAFFNA),
        stop('colombo', COLOMBO),
        stop('kurunegala', KURUNEGALA),
      ],
      KURUNEGALA,
    );

    expect(plan.stops[0].id).toBe('kurunegala');
  });
});

describe('arrival and slack', () => {
  it('waits at the gate rather than arriving before the window opens', () => {
    const plan = planRoute(
      [stop('a', KURUNEGALA, window(at(9), at(11)))],
      KURUNEGALA,
    );

    // No travel, but the driver cannot collect at 00:00 — arrival is when the window opens.
    expect(plan.stops[0].arrivalMinutes).toBe(at(9));
  });

  it('reports how much room is left against each promise', () => {
    const plan = planRoute(
      [stop('a', KURUNEGALA, window(at(9), at(11)))],
      KURUNEGALA,
    );

    expect(plan.stops[0].slackMinutes).toBe(120);
    expect(plan.tightestSlackMinutes).toBe(120);
  });

  /**
   * The failure overlap alone never caught: two windows that do not overlap and are still
   * impossible, because the driving between them does not fit in the gap.
   */
  it('refuses promises that do not overlap but cannot both be kept', () => {
    const colombo = stop('colombo', COLOMBO, window(at(8), at(9)));
    const jaffna = stop('jaffna', JAFFNA, window(at(9), at(10)));

    const plan = planRoute([colombo, jaffna], COLOMBO);

    // ~340 km apart. An hour is not enough, and the plan has to say so.
    expect(plan.feasible).toBe(false);
    expect(plan.tightestSlackMinutes).toBeLessThan(0);
  });

  it('accepts the same two promises when the gap is big enough', () => {
    const colombo = stop('colombo', COLOMBO, window(at(6), at(7)));
    const jaffna = stop('jaffna', JAFFNA, window(at(18), at(20)));

    expect(planRoute([colombo, jaffna], COLOMBO).feasible).toBe(true);
  });
});

describe('canInsert', () => {
  const held = [stop('held', KURUNEGALA, window(at(8), at(10)))];

  it('allows a job that fits around what is already promised', () => {
    const plan = canInsert(
      held,
      stop('new', KURUNEGALA, window(at(13), at(15))),
      KURUNEGALA,
    );

    expect(plan).not.toBeNull();
    expect(plan?.stops).toHaveLength(2);
  });

  it('refuses one that cannot be reached in time, and says nothing about why beyond that', () => {
    const plan = canInsert(
      held,
      stop('new', JAFFNA, window(at(10), at(11))),
      KURUNEGALA,
    );

    expect(plan).toBeNull();
  });

  it('leaves the held stops untouched when it refuses', () => {
    const before = JSON.stringify(held);

    canInsert(held, stop('new', JAFFNA, window(at(10), at(11))), KURUNEGALA);

    expect(JSON.stringify(held)).toBe(before);
  });
});

describe('finding a slot a driver could actually promise', () => {
  it('divides the farmer window into whole slots', () => {
    expect(slotsWithin(window(at(6), at(12)), 120)).toHaveLength(3);
  });

  it('drops a tail too short to be a real promise', () => {
    // 6:00–9:00 in two-hour slots is one whole slot; the leftover hour is not offered.
    expect(slotsWithin(window(at(6), at(9)), 120)).toHaveLength(1);
  });

  /**
   * Two farms in the same window at the same village *is* doable — load one 6:00–6:17 and the
   * next 6:17–6:34, both inside 6:00–8:00. The old overlap-only rule refused this, and refusing it
   * is wrong: a shared-transport morning round is the whole point of the product.
   *
   * So the planner is deliberately *less* strict than overlap where the driving allows, and
   * stricter where overlap missed an impossibility — see the Colombo-to-Jaffna case above.
   */
  it('allows two nearby promises inside one window, which overlap alone refused', () => {
    const held = [stop('held', KURUNEGALA, window(at(6), at(8)))];

    const slot = firstFeasibleSlot(
      held,
      { id: 'new', point: KURUNEGALA, quantityKg: 200 },
      window(at(6), at(12)),
      120,
      KURUNEGALA,
    );

    expect(slot).toEqual(window(at(6), at(8)));
  });

  /* The board needs this: "is there *any* time I could promise?", answered without the driver
     picking one first. Here the early slots genuinely cannot be reached, so a later one is found. */
  it('skips past slots the driving cannot reach and offers one that works', () => {
    const held = [stop('held', COLOMBO, window(at(6), at(8)))];

    const slot = firstFeasibleSlot(
      held,
      { id: 'new', point: KURUNEGALA, quantityKg: 200 },
      window(at(6), at(18)),
      120,
      COLOMBO,
    );

    expect(slot).not.toBeNull();
    expect(slot?.from).toBeGreaterThanOrEqual(at(8));
  });

  it('returns nothing when the whole offered window is unreachable', () => {
    const held = [stop('held', COLOMBO, window(at(6), at(8)))];

    const slot = firstFeasibleSlot(
      held,
      { id: 'new', point: JAFFNA, quantityKg: 200 },
      window(at(8), at(10)),
      120,
      COLOMBO,
    );

    expect(slot).toBeNull();
  });
});
