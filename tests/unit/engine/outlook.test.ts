// Phase 7 (SPEC §9): dasha fixtures match; the Parabhava 2026–27 table loads for all 12 rasis; the year rolls over at Ugadi.
import { describe, expect, it } from 'vitest';
import dashaFixture from '../../fixtures/dasha-golden.json';
import chartFixture from '../../fixtures/charts-golden.json';
import vimshottari from '../../../src/engine/tables/vimshottari.json';
import gochara from '../../../src/engine/tables/gochara.json';
import outlookTable from '../../../src/engine/tables/outlook.json';
import parabhava from '../../../src/engine/tables/yearly/parabhava-2026-27.json';
import rasis from '../../../src/engine/tables/rasis.json';
import { createEngine } from '../../../src/engine/core/engine';
import { loadEphemeris } from '../../../src/engine/ephemeris';
import { houseFrom, transit } from '../../../src/engine/rules/gochara';
import { yearlyTables } from '../../../src/engine/core/outlook';

const engine = createEngine(() => loadEphemeris());
const LONGITUDE_TOLERANCE_DEG = 0.01;
const MINUTE = 1 / 1440;
/** The whole dasha sequence shifts with the Moon: a 0.01° error moves it by first-lord years × 0.01 / 13°20′. */
const shiftTolerance = (firstLord: string) => (vimshottari.order.find((o) => o.lord === firstLord)!.years * vimshottari.yearDays * LONGITUDE_TOLERANCE_DEG) / (360 / 27) + MINUTE;
const HYD = { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' };

describe('dasha fixtures (tests/fixtures/dasha-golden.json)', () => {
  const unverified = dashaFixture.rows.filter((r) => !r.verified).map((r) => r.id);
  if (unverified.length) it.todo(`confirm against a published jatakam: ${unverified.join(', ')}`);

  for (const row of dashaFixture.rows) {
    it(`${row.id}: nine mahadashas, the running mahadasha/antardasha and its antardashas`, async () => {
      const ch = chartFixture.rows.find((c) => c.id === row.chart)!;
      const c = await engine.birthChart({ date: ch.birth.date, ...(ch.birth.time && { time: ch.birth.time }), timeKnown: ch.birth.timeKnown, place: ch.place });
      const tol = shiftTolerance(row.mahadashas[0]!.lord);
      expect(c.dasha.mahadashas.map((m) => m.lord)).toEqual(row.mahadashas.map((m) => m.lord));
      row.mahadashas.forEach((m, i) => {
        expect(Math.abs(c.dasha.mahadashas[i]!.start.jdUt - m.startJd), `${m.lord} start`).toBeLessThanOrEqual(tol);
        expect(Math.abs(c.dasha.mahadashas[i]!.end.jdUt - m.endJd), `${m.lord} end`).toBeLessThanOrEqual(tol);
      });
      const at = row.at.jd;
      const maha = c.dasha.mahadashas.find((m) => m.start.jdUt <= at && at < m.end.jdUt)!;
      const antar = maha.antardashas.find((a) => a.start.jdUt <= at && at < a.end.jdUt)!;
      expect(maha.lord).toBe(row.at.mahadasha.lord);
      expect(antar.lord).toBe(row.at.antardasha.lord);
      row.at.antardashas.forEach((a, i) => {
        expect(maha.antardashas[i]!.lord).toBe(a.lord);
        expect(Math.abs(maha.antardashas[i]!.start.jdUt - a.startJd), `${maha.lord}–${a.lord} start`).toBeLessThanOrEqual(tol);
        expect(Math.abs(maha.antardashas[i]!.end.jdUt - a.endJd), `${maha.lord}–${a.lord} end`).toBeLessThanOrEqual(tol);
      });
    });
  }
});

describe('gochara (tables/gochara.json, reference.md §10)', () => {
  it('counts houses from the janma rasi and uses the table good houses; never "avoid"', () => {
    expect(houseFrom(2, 2)).toBe(1);
    expect(houseFrom(2, 12)).toBe(11);
    expect(houseFrom(12, 1)).toBe(2);
    for (const [planet, rule] of Object.entries(gochara.planets) as ['jupiter' | 'saturn' | 'rahu', { good: number[] }][]) {
      for (let h = 1; h <= 12; h++) {
        const t = transit(planet, 1, h);
        expect(t.house).toBe(h);
        expect(t.status).toBe(rule.good.includes(h) ? 'good' : 'mixed');
      }
    }
  });
  it('names Saturn phases: sade sati 12/1/2, ardhashtama 4, ashtama 8', () => {
    expect([12, 1, 2].map((h) => transit('saturn', 1, h).phase)).toEqual(['sadeSati', 'sadeSati', 'sadeSati']);
    expect(transit('saturn', 1, 4).phase).toBe('ardhashtama');
    expect(transit('saturn', 1, 8).phase).toBe('ashtama');
    expect(transit('saturn', 1, 11).phase).toBeUndefined();
    expect(transit('jupiter', 1, 12).phase).toBeUndefined();
  });
});

describe('yearly tables (tables/yearly/*.json)', () => {
  it('Parabhava 2026–27 loads for all 12 rasis, within scale, with a source', () => {
    expect(parabhava.samvatsara).toMatchObject({ number: 40, en: 'Parabhava', shaka: 1948 });
    expect(parabhava.rasis.map((r) => r.rasi)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    parabhava.rasis.forEach((r, i) => expect(r.en).toBe(rasis.items[i]!.en));
    for (const r of parabhava.rasis) {
      for (const k of ['aadayam', 'vyayam', 'rajapujyam', 'avamanam'] as const) {
        expect(r[k], `${r.en} ${k}`).toBeGreaterThanOrEqual(0);
        expect(r[k], `${r.en} ${k}`).toBeLessThanOrEqual(parabhava.scale[k]);
      }
    }
    expect(parabhava.source).toMatch(/onlinejyotish/);
    expect(yearlyTables().map((t) => t.samvatsara.number)).toContain(40);
  });
  it('sanity (reference.md §11): rasis with the same lord share aadayam and vyayam', () => {
    const byLord = new Map<string, { aadayam: number; vyayam: number }[]>();
    for (const r of parabhava.rasis) {
      const lord = rasis.items[r.rasi - 1]!.lord;
      byLord.set(lord, [...(byLord.get(lord) ?? []), { aadayam: r.aadayam, vyayam: r.vyayam }]);
    }
    for (const [lord, rows] of byLord) for (const x of rows) expect(x, lord).toEqual(rows[0]);
  });
  it.todo('Plavanga 2027–28 table: add tables/yearly/plavanga-2027-28.json at Ugadi 2027 (SPEC §12 launch checklist)');
});

describe('engine.yearOutlook: Ugadi rollover', () => {
  // Ugadi 2026 = 19 March (Parabhava), Ugadi 2027 = 7 April (Plavanga) — samvatsaras.json anchors (Drik Panchang day pages).
  it('the day before Ugadi 2027 is still Parabhava; Ugadi 2027 starts Plavanga (no table yet)', async () => {
    const before = await engine.yearOutlook({ rasi: 2, date: '2027-04-06', place: HYD });
    expect(before.samvatsara.number).toBe(40);
    expect(before.samvatsara.name.en).toBe('Parabhava');
    expect(before.ugadi).toEqual({ start: '2026-03-19', end: '2027-04-07' });
    expect(before.table).toMatchObject({ aadayam: 5, vyayam: 14, rajapujyam: 5, avamanam: 4 });
    expect(before.months[before.current]!.masa.number).toBe(12); // Phalgunam

    const ugadi = await engine.yearOutlook({ rasi: 2, date: '2027-04-07', place: HYD });
    expect(ugadi.samvatsara.number).toBe(41);
    expect(ugadi.samvatsara.name.en).toBe('Plavanga');
    expect(ugadi.ugadi.start).toBe('2027-04-07');
    expect(ugadi.table).toBeNull();
    expect(ugadi.reasons[0]!.ruleId).toBe('year.tableMissing');
    expect(ugadi.current).toBe(0);
    expect(ugadi.months[0]!.masa.number).toBe(1); // Chaitram
  }, 30_000);

  it('Ugadi 2026: 18 March is the previous year (Vishvavasu), 19 March is Parabhava', async () => {
    const before = await engine.yearOutlook({ rasi: 1, date: '2026-03-18', place: HYD });
    expect(before.samvatsara.number).toBe(39);
    expect(before.table).toBeNull();
    const day = await engine.yearOutlook({ rasi: 1, date: '2026-03-19', place: HYD });
    expect(day.samvatsara.number).toBe(40);
    expect(day.table).toMatchObject({ aadayam: 11, vyayam: 5 });
  }, 30_000);

  it('Parabhava has 13 months (adhika Jyeshtha in 2026), Chaitram first and Phalgunam last, each with three transits', async () => {
    const y = await engine.yearOutlook({ rasi: 2, date: '2026-11-22', place: HYD });
    expect(y.months).toHaveLength(13);
    expect(y.months.filter((m) => m.masa.adhika).map((m) => m.masa.number)).toEqual([3]);
    expect(y.months[0]!.masa.number).toBe(1);
    expect(y.months.at(-1)!.masa.number).toBe(12);
    expect(y.months[0]!.start).toBe('2026-03-19');
    for (let i = 1; i < y.months.length; i++) expect(y.months[i]!.start > y.months[i - 1]!.start).toBe(true);
    for (const m of y.months) {
      expect(m.transits.map((t) => t.planet)).toEqual(['jupiter', 'saturn', 'rahu']);
      const good = m.transits.filter((t) => t.status === 'good').length;
      expect(m.status).toBe(good >= outlookTable.year.monthStatus.goodIfAtLeast ? 'good' : 'mixed');
    }
    expect(y.months[y.current]!.masa.number).toBe(8); // 22 Nov 2026 is in Karthikam
  }, 30_000);
});

describe('engine.jobOutlook', () => {
  const vij = chartFixture.rows.find((r) => r.id === 'vij-1995-08-14')!;
  const person = { id: 'p1', birth: { date: vij.birth.date, time: vij.birth.time!, timeKnown: true, place: vij.place } };

  it('dasha now matches the fixture; three transits from the janma rasi with their next move', async () => {
    const o = await engine.jobOutlook({ person, from: '2026-11-22', days: 90, place: HYD });
    const fx = dashaFixture.rows.find((r) => r.chart === vij.id)!;
    expect(o.dasha.current.lord).toBe(fx.at.mahadasha.lord);
    expect(o.dasha.currentAntar.lord).toBe(fx.at.antardasha.lord);
    expect(o.dasha.mahadashas).toHaveLength(9);
    expect(o.person.rasi).toBe(vij.expected.moon.rasi);
    expect(o.transits.map((t) => t.planet)).toEqual(['jupiter', 'saturn', 'rahu']);
    for (const t of o.transits) {
      expect(t.house).toBe(houseFrom(o.person.rasi, t.rasi));
      expect(t.until!.date > '2026-11-22').toBe(true);
      expect(t.nextRasi).not.toBe(t.rasi);
    }
    expect(o.status).toBe(o.transits.filter((t) => t.status === 'good').length >= 2 ? 'good' : 'mixed');
  }, 60_000);

  it('best windows and joining days stay in range and outside any hold-off; remedies are free', async () => {
    // Dallas 2012 chart: Mars mahadasha ends in 2026 → a changeover can fall in the range.
    const dal = chartFixture.rows.find((r) => r.id === 'dal-2012-07-04')!;
    const fx = dashaFixture.rows.find((r) => r.chart === dal.id)!;
    const change = fx.mahadashas.find((m) => m.start > '2026-11-22')!.start.slice(0, 10);
    const from = new Date(Date.parse(change) - 30 * 86_400_000).toISOString().slice(0, 10);
    const o = await engine.jobOutlook({ person: { id: 'd', birth: { date: dal.birth.date, time: dal.birth.time!, timeKnown: true, place: dal.place } }, from, days: 90, place: dal.place });
    expect(o.holdOff.length).toBeGreaterThan(0);
    const end = new Date(Date.parse(from) + 89 * 86_400_000).toISOString().slice(0, 10);
    const held = (d: string) => o.holdOff.some((h) => d >= h.start && d <= h.end);
    expect(o.windows.length).toBeLessThanOrEqual(outlookTable.job.windows.count);
    for (const w of o.windows) {
      expect(w.start >= from && w.end <= end && w.start <= w.end).toBe(true);
      for (let d = w.start; d <= w.end; d = new Date(Date.parse(d) + 86_400_000).toISOString().slice(0, 10)) expect(held(d), `${d} held`).toBe(false);
    }
    for (const j of o.joining) expect(held(j.date)).toBe(false);
    expect(o.remedies).toEqual(outlookTable.job.remedies);
  }, 60_000);
});
