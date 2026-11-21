import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/charts-golden.json';
import { createEngine } from '../../../src/engine/core/engine';
import { loadEphemeris } from '../../../src/engine/ephemeris';
import vimshottari from '../../../src/engine/tables/vimshottari.json';
import type { BirthInput } from '../../../src/engine/api';

const engine = createEngine(() => loadEphemeris());
const LONGITUDE_TOLERANCE_DEG = 0.01; // SPEC §9 Phase 2: longitudes ±0.01°
/** The dasha balance error that a 0.01° Moon error produces: lord years × 0.01° / 13°20′. */
const balanceTolerance = (lord: string) => (vimshottari.order.find((o) => o.lord === lord)!.years * LONGITUDE_TOLERANCE_DEG) / (360 / 27);
const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

type Row = (typeof fixture.rows)[number];
const input = (r: Row): BirthInput => ({
  date: r.birth.date,
  ...('time' in r.birth && r.birth.time ? { time: r.birth.time } : {}),
  timeKnown: r.birth.timeKnown,
  place: { lat: r.place.lat, lon: r.place.lon, tz: r.place.tz },
});

describe('chart fixtures (tests/fixtures/charts-golden.json)', () => {
  const unverified = fixture.rows.filter((r) => !r.verified).map((r) => r.id);
  if (unverified.length) it.todo(`confirm against a published chart and set verified: true: ${unverified.join(', ')}`);

  for (const r of fixture.rows) {
    it(`${r.id} · ${r.place.nameEn} ${r.birth.date}${r.birth.timeKnown ? '' : ' (time unknown)'}`, async () => {
      const c = await engine.birthChart(input(r));
      const { longitude: moonLon, ...moonPlace } = r.expected.moon;
      expect({ rasi: c.moon.rasi, nakshatra: c.moon.nakshatra, pada: c.moon.pada }, 'moon').toEqual(moonPlace);
      expect(angleDiff(c.moon.longitude, moonLon), `moon ${c.moon.longitude.toFixed(4)}° vs ${moonLon}°`).toBeLessThanOrEqual(LONGITUDE_TOLERANCE_DEG);
      if (r.expected.lagna) {
        expect(c.lagna?.rasi, 'lagna').toBe(r.expected.lagna.rasi);
        expect(angleDiff(c.lagna!.longitude, r.expected.lagna.longitude), `lagna ${c.lagna!.longitude.toFixed(4)}° vs ${r.expected.lagna.longitude}°`).toBeLessThanOrEqual(LONGITUDE_TOLERANCE_DEG);
      } else expect(c.lagna, 'no lagna when the time is unknown').toBeUndefined();
      for (const [body, want] of Object.entries(r.expected.planets)) {
        expect(c.planets[body as keyof typeof c.planets].rasi, body).toBe(want.rasi);
      }
      expect(c.dasha.mahadashas[0]!.lord, 'first dasha lord').toBe(r.expected.dasha.firstLord);
      expect(Math.abs(c.dasha.balanceYears - r.expected.dasha.balanceYears), 'dasha balance (years)').toBeLessThanOrEqual(balanceTolerance(r.expected.dasha.firstLord));
      expect(c.approximate).toBe(!r.birth.timeKnown);
    });
  }
});

describe('time unknown never produces a lagna', () => {
  it.each([
    ['2000-01-01', 'Asia/Kolkata'],
    ['1985-06-15', 'Asia/Kolkata'],
    ['2020-11-01', 'America/Chicago'],
  ])('%s %s', async (date, tz) => {
    const c = await engine.birthChart({ date, timeKnown: false, time: '05:30', place: { lat: 17.385, lon: 78.4867, tz } });
    expect(c.lagna).toBeUndefined();
    expect('lagna' in c).toBe(false);
    expect(c.approximate).toBe(true);
    expect(c.timeNote).toBe('noon');
    expect(c.dayRange?.nakshatras.length).toBeGreaterThanOrEqual(1);
  });

  it('a known time does produce one', async () => {
    const c = await engine.birthChart({ date: '2000-01-01', time: '05:30', timeKnown: true, place: { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' } });
    expect(c.lagna?.rasi).toBeGreaterThanOrEqual(1);
    expect(c.dayRange).toBeUndefined();
  });
});

describe('time unknown: the nakshatra range steps around 27 → 1', () => {
  it('lists every nakshatra the Moon touches on the date, in order', async () => {
    // Search Jan–Feb 2026 for a civil day on which the Moon crosses 360° (Revati → Ashwini).
    let found = false;
    for (let d = 1; d <= 60 && !found; d++) {
      const date = new Date(Date.UTC(2026, 0, d)).toISOString().slice(0, 10);
      const c = await engine.birthChart({ date, timeKnown: false, place: { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' } });
      const n = c.dayRange!.nakshatras;
      if (n.includes(27) && n.includes(1)) {
        found = true;
        expect(n.indexOf(1)).toBe(n.indexOf(27) + 1);
        for (let i = 1; i < n.length; i++) expect(n[i]).toBe((n[i - 1]! % 27) + 1);
      }
    }
    expect(found, 'a wrap day exists in the window').toBe(true);
  });
});

describe('Vimshottari dasha', () => {
  it('covers 120 years in table order, antardashas proportional and contiguous', async () => {
    const c = await engine.birthChart({ date: '1995-08-14', time: '05:40', timeKnown: true, place: { lat: 16.5062, lon: 80.648, tz: 'Asia/Kolkata' } });
    const m = c.dasha.mahadashas;
    expect(m).toHaveLength(9);
    const order = vimshottari.order.map((o) => o.lord);
    const first = order.indexOf(m[0]!.lord);
    expect(m.map((x) => x.lord)).toEqual([...order.slice(first), ...order.slice(0, first)]);
    const years = (a: { jdUt: number }, b: { jdUt: number }) => (b.jdUt - a.jdUt) / vimshottari.yearDays;
    expect(years(m[0]!.start, m[8]!.end)).toBeCloseTo(120, 6);
    for (const d of m) {
      const total = vimshottari.order.find((o) => o.lord === d.lord)!.years;
      expect(years(d.start, d.end)).toBeCloseTo(total, 6);
      expect(d.antardashas[0]!.lord).toBe(d.lord);
      expect(d.antardashas[0]!.start.jdUt).toBeCloseTo(d.start.jdUt, 6);
      expect(d.antardashas[8]!.end.jdUt).toBeCloseTo(d.end.jdUt, 6);
      for (const a of d.antardashas) {
        const sub = vimshottari.order.find((o) => o.lord === a.lord)!.years;
        expect(years(a.start, a.end)).toBeCloseTo((total * sub) / 120, 6);
      }
    }
    // Birth falls inside the first mahadasha, with the balance remaining.
    const birth = m[0]!.end.jdUt - c.dasha.balanceYears * vimshottari.yearDays;
    expect(birth).toBeGreaterThan(m[0]!.start.jdUt);
  });
});
