// Muhurtham scorer (tables/muhurtham.json, rules/muhurtham.ts, engine.findMuhurtham).
// SPEC §9 Phase 6 done-when: a 90-day search < 2 s, and no suggested window overlaps an avoid period (property test).
import { describe, expect, it } from 'vitest';
import table from '../../../src/engine/tables/muhurtham.json';
import dayPeriodTable from '../../../src/engine/tables/day-periods.json';
import { dayExclusions, scoreDay, EVENT_IDS, type DayContext, type EventId } from '../../../src/engine/rules/muhurtham';
import type { DayPeriod } from '../../../src/engine/core/dayPeriods';
import { createEngine } from '../../../src/engine/core/engine';
import { loadEphemeris } from '../../../src/engine/ephemeris';
import { addDays } from '../../../src/engine/core/time';
import type { Door, MuhurthamWindowView } from '../../../src/engine/api';

const HOUR = 1 / 24;
const VARAS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

describe('muhurtham table', () => {
  it('has the five events with valid lists and a source each', () => {
    expect(EVENT_IDS.sort()).toEqual(['business', 'gruhapravesam', 'job', 'vehicle', 'vivaham']);
    for (const id of EVENT_IDS) {
      const ev = table.events[id] as unknown as { source: string; nakshatras: { good: number[]; avoid: number[] }; tithis: { good: number[]; avoid: number[] }; varas: { good: string[]; avoid: string[] }; window: string; name: { en: string; te: string } };
      expect(ev.source.trim(), id).not.toBe('');
      expect(['daytime', 'fullDay']).toContain(ev.window);
      expect(ev.name.te, id).toMatch(/[ఀ-౿]/);
      for (const n of [...ev.nakshatras.good, ...ev.nakshatras.avoid]) expect(n).toBeGreaterThanOrEqual(1), expect(n).toBeLessThanOrEqual(27);
      for (const t of [...ev.tithis.good, ...ev.tithis.avoid]) expect(t).toBeGreaterThanOrEqual(1), expect(t).toBeLessThanOrEqual(15);
      for (const v of [...ev.varas.good, ...ev.varas.avoid]) expect(VARAS).toContain(v);
      expect(ev.varas.good.filter((v) => ev.varas.avoid.includes(v))).toEqual([]);
    }
  });

  it('removes every avoid-kind day period (so the property test covers all of them)', () => {
    const avoidKinds = Object.entries(dayPeriodTable.kinds).filter(([, k]) => k.status === 'avoid').map(([id]) => id);
    expect([...table.general.removePeriods].sort()).toEqual(avoidKinds.sort());
    const goodKinds = Object.entries(dayPeriodTable.kinds).filter(([, k]) => k.status === 'good').map(([id]) => id);
    expect([...table.general.preferPeriods].sort()).toEqual(goodKinds.sort());
  });

  it('entry groups split tithis 1–15 (amavasya aside) and doors map only to groups that exist', () => {
    const e = table.events.gruhapravesam.entry;
    expect(Object.values(e.groups).flat().sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    for (const g of Object.values(e.byDoor)) if (g) expect(Object.keys(e.groups)).toContain(g);
    expect(Object.values(e.byDoor)).not.toContain('rikta');
  });

  it.todo('pandit review: new-job table is unverified; gruhapravesam north/west doors have no tithi rule (sources disagree); chaturmas limits are the standard definition');
});

/** A plain day for unit tests: 06:00–18:00 sunrise/sunset, one span of each anga all day. */
function plainDay(over: Partial<DayContext> = {}): DayContext {
  const sunrise = 2461400.5 + 0.5 / 24; // arbitrary: 06:00 IST-ish in UT terms; only differences matter
  const sunset = sunrise + 12 * HOUR, nextSunrise = sunrise + 24 * HOUR;
  const span = (n: number) => [{ number: n, name: { en: '', te: null }, start: sunrise - HOUR, end: nextSunrise + HOUR }];
  return {
    date: '2027-02-11', sunrise, sunset, nextSunrise, vara: 'fri',
    masa: { number: 11, adhika: false, kshaya: false }, sunriseTithi: 3, sunRasi: 10,
    planets: { venus: { separation: 30, retrograde: false }, jupiter: { separation: 60, retrograde: false } },
    tithi: span(3), nakshatra: span(4), yoga: span(16), karana: span(2),
    moonRasi: [{ start: sunrise - HOUR, end: nextSunrise + HOUR, index: 2 }],
    periods: [],
    ...over,
  };
}
const period = (kind: DayPeriod['kind'], start: number, end: number): DayPeriod => ({ kind, name: { en: kind, te: null }, status: 'avoid', start, end, verified: true });

describe('day-level exclusions', () => {
  const ids = (e: EventId, d: DayContext) => dayExclusions(e, d).map((r) => r.ruleId);
  it('vivaham: adhika, kshaya, chaturmas, kharmas, combust Venus/Jupiter', () => {
    expect(ids('vivaham', plainDay())).toEqual([]);
    expect(ids('vivaham', plainDay({ masa: { number: 5, adhika: true, kshaya: false } }))).toContain('mh.x.adhika');
    expect(ids('vivaham', plainDay({ masa: { number: 9, adhika: false, kshaya: true } }))).toContain('mh.x.kshaya');
    expect(ids('vivaham', plainDay({ masa: { number: 4, adhika: false, kshaya: false }, sunriseTithi: 11 }))).toContain('mh.x.chaturmas');
    expect(ids('vivaham', plainDay({ masa: { number: 4, adhika: false, kshaya: false }, sunriseTithi: 10 }))).not.toContain('mh.x.chaturmas');
    expect(ids('vivaham', plainDay({ masa: { number: 8, adhika: false, kshaya: false }, sunriseTithi: 10 }))).toContain('mh.x.chaturmas');
    expect(ids('vivaham', plainDay({ masa: { number: 8, adhika: false, kshaya: false }, sunriseTithi: 11 }))).not.toContain('mh.x.chaturmas');
    expect(ids('vivaham', plainDay({ sunRasi: 9 }))).toContain('mh.x.kharmas');
    expect(ids('vivaham', plainDay({ planets: { venus: { separation: 9, retrograde: false }, jupiter: { separation: 60, retrograde: false } } }))).toContain('mh.x.combust');
    // Retrograde Venus: 8° orb, so 9° is clear.
    expect(ids('vivaham', plainDay({ planets: { venus: { separation: 9, retrograde: true }, jupiter: { separation: 60, retrograde: false } } }))).not.toContain('mh.x.combust');
    expect(ids('vivaham', plainDay({ planets: { venus: { separation: 30, retrograde: false }, jupiter: { separation: 10.5, retrograde: false } } }))).toContain('mh.x.combust');
  });
  it('gruhapravesam: only its months; business: pitru paksha; vehicle has no month rules', () => {
    expect(ids('gruhapravesam', plainDay({ masa: { number: 9, adhika: false, kshaya: false } }))).toEqual(['mh.x.month']);
    expect(ids('gruhapravesam', plainDay({ masa: { number: 2, adhika: false, kshaya: false } }))).toEqual([]);
    expect(ids('business', plainDay({ masa: { number: 6, adhika: false, kshaya: false }, sunriseTithi: 20 }))).toEqual(['mh.x.pitruPaksha']);
    expect(ids('business', plainDay({ masa: { number: 6, adhika: false, kshaya: false }, sunriseTithi: 10 }))).toEqual([]);
    expect(ids('vehicle', plainDay({ sunRasi: 9, masa: { number: 4, adhika: true, kshaya: false } }))).toEqual([]);
  });
});

describe('windows within a day', () => {
  const people = [{ id: 'a', nakshatra: 4, rasi: 2 }];
  it('cuts out avoid periods and keeps the rest', () => {
    const d = plainDay();
    const rahu = period('rahu', d.sunrise + 3 * HOUR, d.sunrise + 4.5 * HOUR);
    const r = scoreDay('vehicle', { ...d, periods: [rahu] }, people);
    expect(r.windows.length).toBeGreaterThan(0);
    for (const w of r.windows) expect(w.end <= rahu.start || w.start >= rahu.end).toBe(true);
  });
  it('excludes rikta tithis, avoid yogas, Vishti karana, strict-list nakshatras and avoid varas', () => {
    const one = (over: Partial<DayContext>, e: EventId = 'vivaham', ppl = people) => scoreDay(e, plainDay(over), ppl);
    const span = (n: number, d = plainDay()) => [{ number: n, name: { en: '', te: null }, start: d.sunrise - HOUR, end: d.nextSunrise + HOUR }];
    expect(one({}).best).not.toBeNull();
    expect(one({ tithi: span(4) }).excluded[0]!.ruleId).toBe('mh.x.tithi');
    expect(one({ tithi: span(19) }).excluded[0]!.ruleId).toBe('mh.x.tithi'); // krishna chavithi is rikta too
    expect(one({ tithi: span(30) }).excluded[0]!.ruleId).toBe('mh.x.tithi');
    expect(one({ yoga: span(17) }).excluded[0]!.ruleId).toBe('mh.x.yoga');
    expect(one({ karana: span(8) }).excluded[0]!.ruleId).toBe('mh.x.karana'); // k = 8 is Vishti
    expect(one({ nakshatra: span(1) }).excluded[0]!.ruleId).toBe('mh.x.nakshatra'); // Ashwini is not on the vivaham list
    expect(one({ nakshatra: span(10) }, 'vehicle', []).best).not.toBeNull(); // non-strict events only score an unlisted star lower
    expect(one({ vara: 'sat' }).excluded[0]!.ruleId).toBe('mh.x.vara');
  });
  it("a participant's avoid tara removes the window; weak chandrabalam keeps it as mixed", () => {
    const d = plainDay();
    // Day star Rohini (4): from Krittika (3) the count is 2 (Sampat, good); from Ashwini (1) it is 4 (Kshema); from Mrigashira (5) it is 27 → tara 9.
    expect(scoreDay('vivaham', d, [{ id: 'x', nakshatra: 2, rasi: 2 }]).best).toBeNull(); // Bharani → Rohini = 3 (Vipat)
    const weakMoon = scoreDay('vivaham', d, [{ id: 'y', nakshatra: 3, rasi: 3 }]); // Moon in Vrishabha = 12th from Mithuna
    expect(weakMoon.best?.status).toBe('mixed');
    expect(weakMoon.best?.people[0]).toMatchObject({ chandraStatus: 'avoid', taraStatus: 'good' });
  });
  it('a gruhapravesam door limits tithis to its group (strict); unmapped doors leave the tithi out', () => {
    const d = plainDay({ masa: { number: 11, adhika: false, kshaya: false }, vara: 'thu' });
    const east = scoreDay('gruhapravesam', d, [], 'east'); // tithi 3 is jaya; east = bhadra → strict: no window
    expect(east.best).toBeNull();
    expect(east.excluded[0]).toMatchObject({ ruleId: 'mh.x.door', values: { door: 'east', group: 'bhadra' } });
    const span2 = [{ number: 2, name: { en: '', te: null }, start: d.sunrise - HOUR, end: d.nextSunrise + HOUR }];
    const east2 = scoreDay('gruhapravesam', { ...d, tithi: span2 }, [], 'east');
    expect(east2.best?.door).toEqual({ door: 'east', group: 'bhadra', fits: true });
    expect(east2.best!.reasons.find((r) => r.ruleId === 'mh.door')!.values.fits).toBe(true);
    const north = scoreDay('gruhapravesam', d, [], 'north');
    expect(north.best?.door).toEqual({ door: 'north', group: null, fits: false });
    expect(north.best!.reasons.some((r) => r.ruleId === 'mh.door')).toBe(false);
  });
  it('reasons carry rule ids and values only, strongest first', () => {
    const w = scoreDay('vivaham', plainDay(), people).best!;
    for (const r of w.reasons) expect(Object.keys(r).sort()).toEqual(['ruleId', 'values']);
    expect(w.reasons[0]!.ruleId).toBe('mh.nakshatra');
  });
});

// ---------------------------------------------------------------------------------------------
describe('engine.findMuhurtham', () => {
  const engine = createEngine(() => loadEphemeris());
  const PLACES = {
    hyderabad: { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' },
    vijayawada: { lat: 16.5062, lon: 80.648, tz: 'Asia/Kolkata' },
    tirupati: { lat: 13.6288, lon: 79.4192, tz: 'Asia/Kolkata' },
    dallas: { lat: 32.7767, lon: -96.797, tz: 'America/Chicago' },
  };
  const couple = [{ id: 'a', nakshatra: 4, rasi: 2 }, { id: 'b', nakshatra: 13, rasi: 6 }];

  it('90-day search runs in under 2 s (SPEC §9 Phase 6)', async () => {
    await engine.init();
    const t0 = performance.now();
    const r = await engine.findMuhurtham({ event: 'vivaham', from: '2026-11-21', days: 90, place: PLACES.hyderabad, people: couple });
    const ms = performance.now() - t0;
    console.log(`findMuhurtham vivaham 90 days: ${ms.toFixed(0)} ms (engine ${r.ms} ms), ${r.results.length} days`);
    expect(ms).toBeLessThan(2000);
    expect(r.results.length).toBeGreaterThan(0);
  }, 20_000);

  it('results are ranked and carry three reasons, panchanga, people and lagna', async () => {
    const r = await engine.findMuhurtham({ event: 'vivaham', from: '2026-11-21', days: 90, place: PLACES.hyderabad, people: couple });
    for (let i = 1; i < r.results.length; i++) expect(r.results[i - 1]!.score).toBeGreaterThanOrEqual(r.results[i]!.score);
    const w = r.results[0]!;
    expect(w.top).toHaveLength(3);
    expect(w.people.map((p) => p.id)).toEqual(['a', 'b']);
    expect(w.lagna.rasi).toBeGreaterThanOrEqual(1);
    expect(new Set(r.results.map((x) => x.date)).size).toBe(r.results.length); // one window per day
    // Kharmas (Sun in Dhanus, mid-Dec → mid-Jan) keeps vivaham out of those days.
    expect(r.exclusions.find((x) => x.ruleId === 'mh.x.kharmas')?.days).toBeGreaterThan(20);
  }, 20_000);

  it('nothing in range → nearest good day after it', async () => {
    // Gruhapravesam months are Magha, Phalguna, Vaishakha, Jyeshtha: a week in late November has none.
    const r = await engine.findMuhurtham({ event: 'gruhapravesam', from: '2026-11-22', days: 7, place: PLACES.hyderabad, people: couple, door: 'east' });
    expect(r.results).toEqual([]);
    expect(r.exclusions[0]).toMatchObject({ ruleId: 'mh.x.month', days: 7 });
    expect(r.nearest).toBeDefined();
    expect(r.nearest!.date > '2026-11-28').toBe(true);
    expect(r.nearest!.panchanga.masa.number).toBeOneOf([11, 12, 2, 3]);
    // Vivaham in the Dhanus kharmas: nothing that week, nearest after the Sun leaves Dhanus.
    const k = await engine.findMuhurtham({ event: 'vivaham', from: '2026-12-20', days: 7, place: PLACES.hyderabad, people: [] });
    expect(k.results).toEqual([]);
    expect(k.exclusions[0]!.ruleId).toBe('mh.x.kharmas');
    expect(k.nearest!.date >= '2027-01-14').toBe(true);
  }, 30_000);

  // Property: for random events, places, dates, doors and participants, every suggested window
  // (a) overlaps no avoid period of its day, the day before or the day after;
  // (b) has no avoided tithi, yoga or karana anywhere inside it;
  // (c) stays inside the event's allowed part of the day.
  it('property: no suggested window overlaps an avoid period', async () => {
    let seed = 20261121;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
    const doors: Door[] = ['east', 'north', 'west', 'south'];
    const avoid = new Set(table.general.removePeriods);
    let checked = 0;
    for (let run = 0; run < 14; run++) {
      const event = pick(EVENT_IDS);
      const placeName = pick(Object.keys(PLACES) as (keyof typeof PLACES)[]);
      const place = PLACES[placeName];
      const from = addDays('2026-01-01', Math.floor(rand() * 900));
      const people = Array.from({ length: Math.floor(rand() * 3) }, (_, i) => ({ id: `p${i}`, nakshatra: 1 + Math.floor(rand() * 27), rasi: 1 + Math.floor(rand() * 12) }));
      const q = { event, from, days: 30, place, people, ...(event === 'gruhapravesam' && { door: pick(doors) }) };
      const r = await engine.findMuhurtham(q);
      const windows: MuhurthamWindowView[] = [...r.results, ...(r.nearest ? [r.nearest] : [])];
      for (const w of windows) {
        const label = `${event} ${placeName} ${w.date} ${w.start.time}–${w.end.time}`;
        expect(w.end.jdUt, label).toBeGreaterThan(w.start.jdUt);
        for (const date of [addDays(w.date, -1), w.date, addDays(w.date, 1)]) {
          for (const p of await engine.dayPeriods(date, place)) {
            if (!avoid.has(p.kind)) continue;
            const overlaps = p.start.jdUt < w.end.jdUt && p.end.jdUt > w.start.jdUt;
            expect(overlaps, `${label} overlaps ${p.kind} ${p.start.date} ${p.start.time}–${p.end.time}`).toBe(false);
          }
        }
        const pc = await engine.panchangam(w.date, place);
        const inside = (s: { start: { jdUt: number }; end: { jdUt: number } }) => s.start.jdUt < w.end.jdUt && s.end.jdUt > w.start.jdUt;
        const pt = (n: number) => (n === 30 ? 30 : ((n - 1) % 15) + 1);
        for (const t of pc.tithi.filter(inside)) expect(table.general.avoidTithis.includes(t.number) || table.general.avoidTithis.includes(pt(t.number)), `${label} tithi ${t.number}`).toBe(false);
        for (const y of pc.yoga.filter(inside)) expect(table.general.avoidYogas, `${label} yoga ${y.number}`).not.toContain(y.number);
        for (const k of pc.karana.filter(inside)) expect(k.name.en, `${label} karana`).not.toBe('Vishti');
        if (w.door?.group) expect(w.door.fits, `${label} door ${w.door.door}`).toBe(true);
        expect(w.start.jdUt, label).toBeGreaterThanOrEqual(pc.sunrise.jdUt - 1e-9);
        const ev = table.events[event] as { window: string };
        expect(w.end.jdUt, label).toBeLessThanOrEqual((ev.window === 'daytime' ? pc.sunset.jdUt : pc.nextSunrise.jdUt) + 1e-9);
        checked++;
      }
    }
    console.log(`property: ${checked} windows checked`);
    expect(checked).toBeGreaterThan(50);
  }, 120_000);
});
