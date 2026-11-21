import { describe, expect, it } from 'vitest';
import { chandrabalam, tarabalam } from '../../../src/engine/rules/strength';
import { createEngine } from '../../../src/engine/core/engine';
import { loadEphemeris } from '../../../src/engine/ephemeris';

describe('tarabalam (reference.md §4)', () => {
  it.each([
    [4, 4, 1, 'mixed'], // Janma
    [4, 5, 2, 'good'], // Sampat
    [4, 6, 3, 'avoid'], // Vipat
    [4, 8, 5, 'avoid'], // Pratyak
    [4, 12, 9, 'good'], // Parama Mitra
    [4, 13, 1, 'mixed'], // 10th star = Janma again
    [27, 1, 2, 'good'], // wraps around the circle
  ])('birth %i, day %i → tara %i (%s)', (birth, day, tara, status) => {
    const r = tarabalam(birth, day);
    expect(r.tara.number).toBe(tara);
    expect(r.status).toBe(status);
    expect(r.reasons[0]).toMatchObject({ ruleId: 'tarabalam.count', values: { tara } });
  });
});

describe('chandrabalam (reference.md §5)', () => {
  it.each([
    [2, 2, 1, 'good'], [2, 3, 2, 'avoid'], [2, 4, 3, 'good'], [2, 12, 11, 'good'], [2, 1, 12, 'avoid'], [12, 5, 6, 'good'],
  ])('birth rasi %i, Moon in %i → house %i (%s)', (birth, moon, house, status) => {
    const r = chandrabalam(birth, moon);
    expect(r.house).toBe(house);
    expect(r.status).toBe(status);
    expect(r.reasons[0]!.ruleId).toBe('chandrabalam.house');
  });
});

describe('engine.dayStrength', () => {
  const engine = createEngine(() => loadEphemeris());
  it('splits the day where the Moon changes nakshatra (Hyderabad 2026-11-21: UB → Revati 06:50 → Ashwini 05:54)', async () => {
    const s = await engine.dayStrength({ nakshatra: 4, rasi: 2 }, '2026-11-21', { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' });
    expect(s.tarabalam.map((x) => x.reading.reasons[0]!.values.dayNakshatra)).toEqual([26, 27, 1]); // Revati ends 05:54, before the next sunrise
    expect(s.tarabalam[0]!.end.time.slice(0, 5)).toBe('06:50');
    expect(s.tarabalam[1]!.end.jdUt).toBeGreaterThan(s.tarabalam[1]!.start.jdUt);
    // Moon in Meena all day (enters Mesha 05:54 on the 22nd, before the next sunrise).
    expect(s.chandrabalam.map((x) => x.reading.house)).toEqual([11, 12]);
  });
});
