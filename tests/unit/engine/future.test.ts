// Future tab (future.json): configurable horizon — 3 years by month, 10 years by year, whole life by mahadasha.
import { describe, expect, it } from 'vitest';
import chartFixture from '../../fixtures/charts-golden.json';
import dashaFixture from '../../fixtures/dasha-golden.json';
import future from '../../../src/engine/tables/future.json';
import remedies from '../../../src/content/remedies.json';
import { createEngine } from '../../../src/engine/core/engine';
import { loadEphemeris } from '../../../src/engine/ephemeris';
import { houseFrom } from '../../../src/engine/rules/gochara';

const engine = createEngine(() => loadEphemeris());
const vij = chartFixture.rows.find((r) => r.id === 'vij-1995-08-14')!;
const person = { id: 'p', birth: { date: vij.birth.date, time: vij.birth.time!, timeKnown: true, place: vij.place } };
const HYD = { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' };

describe('engine.futureOutlook', () => {
  it('10 years: one period per year, contiguous, dashas from the birth chart, milestones in range', async () => {
    const f = await engine.futureOutlook({ person, from: '2026-11-23', years: 10, place: HYD });
    const chart = await engine.birthChart(person.birth);
    expect(f.horizon).toMatchObject({ from: '2026-11-23', to: '2036-11-23', granularity: 'year' });
    expect(f.periods.length).toBeGreaterThanOrEqual(10);
    expect(f.periods.length).toBeLessThanOrEqual(11);
    expect(f.periods[0]!.start).toBe('2026-11-23');
    for (let i = 1; i < f.periods.length; i++) {
      const prevEnd = new Date(`${f.periods[i - 1]!.end}T00:00:00Z`).getTime();
      expect(new Date(`${f.periods[i]!.start}T00:00:00Z`).getTime() - prevEnd).toBe(86_400_000); // next day
    }
    for (const p of f.periods) {
      expect(p.transits).toHaveLength(3);
      expect(['good', 'mixed']).toContain(p.status);
      expect(p.status).toBe(p.transits!.filter((t) => t.status === 'good').length >= future.status.goodIfAtLeast ? 'good' : 'mixed');
      const m = chart.dasha.mahadashas.find((x) => x.lord === p.mahadasha.lord && x.start.jdUt === p.mahadasha.start.jdUt);
      expect(m, `${p.start} mahadasha`).toBeDefined();
    }
    // A period lists every antardasha in it: the first year starts in Rahu and moves on to Guru (Feb 2027).
    expect(f.periods[0]!.segments.map((g) => g.antardasha.lord).slice(0, 2)).toEqual(['rahu', 'jupiter']);
    for (const p of f.periods) expect(p.segments.length).toBeGreaterThan(0);
    expect(f.now.mahadasha.lord).toBe('ketu'); // dasha fixture vij-1995-08-14 on 2026-11-22
    expect(f.now.antardasha.lord).toBe('rahu');
    expect(f.milestones.length).toBeGreaterThan(5);
    for (let i = 0; i < f.milestones.length; i++) {
      const ms = f.milestones[i]!;
      expect(ms.date >= '2026-11-23' && ms.date <= '2036-11-23').toBe(true);
      expect(ms.house).toBe(houseFrom(f.person.rasi, ms.rasi));
      if (i) expect(ms.date >= f.milestones[i - 1]!.date).toBe(true);
    }
    // Saturn: 12/1/2 from the janma rasi is reported as Sade Sati.
    for (const ms of f.milestones.filter((x) => x.planet === 'saturn')) expect(ms.phase === 'sadeSati').toBe([12, 1, 2].includes(ms.house));
    expect(f.dashas.every((d) => d.antardashas.length > 0)).toBe(true);
  }, 60_000);

  it('3 years: month by month', async () => {
    const f = await engine.futureOutlook({ person, from: '2026-11-23', years: 3, place: HYD });
    expect(f.horizon.granularity).toBe('month');
    expect(f.periods.length).toBeGreaterThanOrEqual(36);
    expect(f.periods.length).toBeLessThanOrEqual(37);
    expect(f.periods[0]).toMatchObject({ start: '2026-11-23', end: '2026-11-30' });
    expect(f.periods[1]).toMatchObject({ start: '2026-12-01', end: '2026-12-31' });
  }, 60_000);

  it('whole life: the nine mahadashas from birth, no transit milestones', async () => {
    const f = await engine.futureOutlook({ person, from: '2026-11-23', years: 0, place: HYD });
    expect(f.horizon.granularity).toBe('mahadasha');
    expect(f.dashas).toHaveLength(9);
    expect(f.periods).toHaveLength(9);
    expect(f.periods.map((p) => p.mahadasha.lord)).toEqual(dashaFixture.rows.find((r) => r.chart === vij.id)!.mahadashas.map((m) => m.lord));
    expect(f.milestones).toEqual([]);
    expect(f.periods.every((p) => p.status === undefined && p.transits === undefined)).toBe(true);
  }, 60_000);

  it('horizon options and remedies come from future.json; remedies are free', () => {
    expect(future.horizons).toContain(future.default);
    for (const id of future.remedies) expect(remedies.items.find((r) => r.id === id)?.free, id).toBe(true);
  });
});
