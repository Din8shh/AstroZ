import { beforeAll, describe, expect, it } from 'vitest';
import { BODIES, loadEphemeris, type Ephemeris } from '../../../src/engine/ephemeris';
import { createEngine } from '../../../src/engine/core/engine';

const J2000 = 2451545.0;
const HYDERABAD = { lat: 17.385, lon: 78.4867 };

describe('Swiss Ephemeris adapter (Lahiri)', () => {
  let eph: Ephemeris;
  beforeAll(async () => {
    eph = await loadEphemeris();
  });

  it('defaults: mean node, upper-limb sunrise', () => {
    expect(eph.options).toEqual({ node: 'mean', sunrise: 'upper-limb' });
    expect(eph.name).toMatch(/^Swiss Ephemeris 2\.\d+/);
  });

  it('Lahiri ayanamsa at J2000 ≈ 23°51′11″ (23.853°)', () => {
    expect(eph.ayanamsa(J2000)).toBeCloseTo(23.853, 3);
  });

  it('sidereal = tropical − ayanamsa for the Sun at J2000 (tropical 280.37°)', () => {
    expect(eph.position('sun', J2000).longitude + eph.ayanamsa(J2000)).toBeCloseTo(280.369, 2);
  });

  it('returns all nine grahas in [0, 360) with Ketu opposite Rahu', () => {
    const p = eph.positions(J2000);
    expect(Object.keys(p)).toEqual([...BODIES]);
    for (const b of BODIES) {
      expect(p[b].longitude).toBeGreaterThanOrEqual(0);
      expect(p[b].longitude).toBeLessThan(360);
    }
    expect(((p.ketu.longitude - p.rahu.longitude + 360) % 360)).toBeCloseTo(180, 9);
    expect(p.rahu.speed).toBeLessThan(0); // mean node always moves backwards
    expect(p.moon.speed).toBeGreaterThan(11);
  });

  it('true node differs from the mean node by under 2°', async () => {
    const t = await loadEphemeris({ node: 'true' });
    const d = Math.abs(((t.position('rahu', J2000).longitude - eph.position('rahu', J2000).longitude + 540) % 360) - 180);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(2);
  });

  it('ascendant is a sidereal longitude and moves ~360° per sidereal day', () => {
    const a0 = eph.ascendant(J2000, HYDERABAD);
    const a1 = eph.ascendant(J2000 + 0.997269566, HYDERABAD);
    expect(a0).toBeGreaterThanOrEqual(0);
    expect(a0).toBeLessThan(360);
    expect(Math.abs(((a1 - a0 + 540) % 360) - 180)).toBeLessThan(0.1);
  });

  it('sunrise modes differ in the expected direction (upper limb earliest)', async () => {
    const from = 2461365.5 - 5.5 / 24; // 2026-11-21 00:00 IST
    const upper = eph.sunrise(from, HYDERABAD)!;
    const centre = (await loadEphemeris({ sunrise: 'disc-centre' })).sunrise(from, HYDERABAD)!;
    const hindu = (await loadEphemeris({ sunrise: 'hindu' })).sunrise(from, HYDERABAD)!;
    expect(upper).toBeLessThan(centre);
    expect(centre).toBeLessThan(hindu);
    expect((hindu - upper) * 1440).toBeLessThan(5); // a few minutes at this latitude
  });
});

describe('engine.sunTimes', () => {
  const engine = createEngine(() => loadEphemeris());

  it('returns sunrise, sunset and next sunrise in order, in local time', async () => {
    const s = await engine.sunTimes('2026-11-21', { ...HYDERABAD, tz: 'Asia/Kolkata' });
    expect(s.sunrise?.date).toBe('2026-11-21');
    expect(s.nextSunrise?.date).toBe('2026-11-22');
    expect(s.sunrise!.jdUt).toBeLessThan(s.sunset!.jdUt);
    expect(s.sunset!.jdUt).toBeLessThan(s.nextSunrise!.jdUt);
  });

  it('a sunrise is always on the requested civil date (Tromsø, midnight-sun season)', async () => {
    for (const date of ['2026-05-10', '2026-05-18', '2026-05-22', '2026-07-25']) {
      const s = await engine.sunTimes(date, { lat: 69.65, lon: 18.96, tz: 'Europe/Oslo' });
      if (s.sunrise) expect(s.sunrise.date).toBe(date);
    }
  });

  it('polar night: no sunrise rather than a wrong one', async () => {
    const s = await engine.sunTimes('2026-12-21', { lat: 78.22, lon: 15.65, tz: 'Arctic/Longyearbyen' });
    expect(s.sunrise).toBeNull();
    expect(s.nextSunrise).toBeNull();
  });
});
