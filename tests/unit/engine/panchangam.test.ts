import { beforeAll, describe, expect, it } from 'vitest';
import { loadEphemeris, type Ephemeris } from '../../../src/engine/ephemeris';
import { createEngine } from '../../../src/engine/core/engine';
import { angles, fiveAngas, names } from '../../../src/engine/core/panchangam';
import { resolveLocal } from '../../../src/engine/core/time';
import dayTable from '../../../src/engine/tables/day-periods.json';
import type { GeoPlace } from '../../../src/engine/api';

const HYD: GeoPlace = { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' };
const SECOND = 1 / 86_400;

describe('anga end times (bisection to 1 s)', () => {
  let eph: Ephemeris;
  beforeAll(async () => { eph = await loadEphemeris(); });

  it('each end is the boundary crossing, to within 2 seconds, and spans are contiguous', () => {
    const from = resolveLocal({ date: '2026-11-21', time: '06:24', tz: HYD.tz }).jdUt;
    const a = angles(eph);
    const five = fiveAngas(eph, from, from + 1);
    const fns = { tithi: [a.elongation, 12], nakshatra: [a.moon, 360 / 27], yoga: [a.yogaSum, 360 / 27], karana: [a.elongation, 6] } as const;
    for (const [field, [f, span]] of Object.entries(fns)) {
      const spans = five[field as keyof typeof five];
      expect(spans.length, field).toBeGreaterThan(0);
      for (let i = 0; i < spans.length; i++) {
        const s = spans[i]!;
        const idx = (t: number) => Math.floor(f(t) / span) + 1;
        expect(idx(s.end - 2 * SECOND), `${field} ${s.number} just before end`).toBe(s.number);
        expect(idx(s.end + 2 * SECOND), `${field} ${s.number} just after end`).not.toBe(s.number);
        if (i > 0) expect(s.start).toBe(spans[i - 1]!.end);
      }
    }
  });

  it('karana names follow the fixed + movable cycle', () => {
    expect(names.karana(1).en).toBe('Kimstughna');
    expect(names.karana(2).en).toBe('Bava');
    expect(names.karana(8).en).toBe('Vishti');
    expect(names.karana(57).en).toBe('Vishti');
    expect([58, 59, 60].map((k) => names.karana(k).en)).toEqual(['Shakuni', 'Chatushpada', 'Naga']);
  });
});

describe('calendar', () => {
  const engine = createEngine(() => loadEphemeris());

  it.each([
    ['2026-06-01', 3, true], // Adhika Jyeshtha 2026 (17 May – 15 Jun)
    ['2026-06-25', 3, false], // Nija Jyeshtha
    ['2026-11-21', 8, false], // Kartika
  ])('%s → masa %i, adhika %s', async (date, masa, adhika) => {
    const p = await engine.panchangam(date, HYD);
    expect(p.masa.number).toBe(masa);
    expect(p.masa.adhika).toBe(adhika);
  });

  it('Ugadi 2027 rolls Parabhava (40) over to Plavanga (41)', async () => {
    const before = await engine.panchangam('2027-04-06', HYD);
    const ugadi = await engine.panchangam('2027-04-07', HYD);
    expect([before.masa.number, before.samvatsara.name.en]).toEqual([12, 'Parabhava']);
    expect([ugadi.masa.number, ugadi.tithi[0]!.number, ugadi.samvatsara.name.en, ugadi.samvatsara.shaka]).toEqual([1, 1, 'Plavanga', 1949]);
  });

  it('ayana by sidereal sankranti', async () => {
    expect((await engine.panchangam('2026-01-20', HYD)).ayana.id).toBe('uttarayana');
    expect((await engine.panchangam('2026-07-20', HYD)).ayana.id).toBe('dakshinayana');
  });

  it('vara is the weekday of the date', async () => {
    expect((await engine.panchangam('2026-11-21', HYD)).vara.name.en).toBe('Saturday');
  });
});

describe('day periods come from the table, for every weekday', () => {
  const engine = createEngine(() => loadEphemeris());
  const dates = ['2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28']; // Sun … Sat

  it.each(dates)('%s', async (date) => {
    const p = await engine.panchangam(date, HYD);
    const periods = await engine.dayPeriods(date, HYD);
    const vara = p.vara.id as keyof typeof dayTable.durmuhurtham.daySlots;
    const rise = p.sunrise.jdUt, set = p.sunset.jdUt;
    const slotOf = (jd: number, parts: number) => Math.round(((jd - rise) / (set - rise)) * parts) + 1;

    for (const kind of ['rahu', 'yamagandam', 'gulika'] as const) {
      const got = periods.filter((x) => x.kind === kind);
      expect(got, kind).toHaveLength(1);
      expect(slotOf(got[0]!.start.jdUt, 8), `${kind} slot`).toBe(dayTable.daytimeKalams.slots[kind][vara]);
      expect(got[0]!.end.jdUt).toBeLessThanOrEqual(set + 1e-9);
    }
    const dm = periods.filter((x) => x.kind === 'durmuhurtham');
    const night = (dayTable.durmuhurtham.nightSlots as Record<string, number[]>)[vara] ?? [];
    expect(dm).toHaveLength(dayTable.durmuhurtham.daySlots[vara].length + night.length);
    const ab = periods.filter((x) => x.kind === 'abhijit');
    expect(ab).toHaveLength(dayTable.abhijit.skipVaras.includes(vara) ? 0 : 1);
    for (const x of periods) expect(x.end.jdUt).toBeGreaterThan(x.start.jdUt);
    expect(periods.map((x) => x.start.jdUt)).toEqual([...periods.map((x) => x.start.jdUt)].sort((a, b) => a - b));
  });
});
