import {
  DISTRICT_NAMES,
  DISTRICT_POINTS,
  districtPoint,
} from '@farm-pool/shared';

/**
 * The district table backs the pickup map a driver navigates by, so a wrong or missing entry is a
 * driver sent to the wrong part of the country. It lives in `packages/shared` and has no api code
 * of its own, but this is where the suite runs, so it is tested here.
 */
describe('district points', () => {
  it('covers all 25 districts, uniquely', () => {
    expect(DISTRICT_POINTS).toHaveLength(25);
    expect(new Set(DISTRICT_NAMES).size).toBe(25);
  });

  /* Sri Lanka's bounding box, roughly: 5.9–9.9 N, 79.6–81.9 E. A typo in a coordinate is the
     failure this catches — a transposed pair or a dropped digit lands in the sea. */
  it('puts every district inside Sri Lanka', () => {
    for (const d of DISTRICT_POINTS) {
      expect(d.latitude).toBeGreaterThan(5.8);
      expect(d.latitude).toBeLessThan(10.0);
      expect(d.longitude).toBeGreaterThan(79.5);
      expect(d.longitude).toBeLessThan(82.0);
    }
  });

  it('matches however the district was typed', () => {
    const expected = {
      name: 'Kurunegala',
      latitude: 7.4863,
      longitude: 80.3647,
    };
    expect(districtPoint('Kurunegala')).toEqual(expected);
    expect(districtPoint('kurunegala')).toEqual(expected);
    expect(districtPoint('  KURUNEGALA  ')).toEqual(expected);
    expect(districtPoint('nuwara  eliya')).toMatchObject({
      name: 'Nuwara Eliya',
    });
  });

  /* Deliberately strict about spelling. A fuzzy match that silently puts a pickup in the wrong
     district is worse than no map, because the driver acts on it. */
  it('returns nothing for a town, a misspelling or a decorated name', () => {
    expect(districtPoint('Wariyapola')).toBeUndefined();
    expect(districtPoint('Kurunegala District')).toBeUndefined();
    expect(districtPoint('Kurunagala')).toBeUndefined();
    expect(districtPoint('')).toBeUndefined();
  });

  it('agrees with the district a driver and a listing already store as free text', () => {
    // `operatingDistrict` and a listing's `district` are compared case-insensitively elsewhere;
    // the table has to resolve the same strings those comparisons accept.
    expect(districtPoint('Kurunegala')?.name).toBe(
      districtPoint('  kurunegala ')?.name,
    );
  });
});
