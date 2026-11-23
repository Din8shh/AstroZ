// Job outlook and Ugadi-year outlook. Pure computation over the Ephemeris interface plus engine helpers
// (birth chart, muhurtham search, cached amanta months); every rule and number comes from tables.
import type { BirthChart, BirthInput, DashaSpan, FutureDetail, FutureDetailInput, FutureInput, FutureOutlook, FuturePeriod, GeoPlace, JobOutlook, JobOutlookInput, MuhurthamQuery, MuhurthamResult, TransitMilestone, TransitView, YearOutlook, YearOutlookInput } from '../api';
import type { Ephemeris } from '../ephemeris/types';
import type { Masa } from './panchangam';
import { angles, findCrossing, names as angaNames, samvatsara as samvatsaraOf } from './panchangam';
import { nakshatraOf, rasiName, rasiOf } from './chart';
import { addDays, resolveLocal, toLocal } from './time';
import { chandrabalam, tarabalam, type Reason, type Status } from '../rules/strength';
import { TRANSIT_PLANETS, transit, type TransitPlanet } from '../rules/gochara';
import grahas from '../tables/grahas.json';
import outlook from '../tables/outlook.json';
import vimshottari from '../tables/vimshottari.json';
import future from '../tables/future.json';

const DAY = 1;
const SECOND = 1 / 86_400;

type YearTable = {
  source: string;
  samvatsara: { number: number; en: string; te: string | null; shaka: number };
  scale: { aadayam: number; vyayam: number; rajapujyam: number; avamanam: number };
  rasis: { rasi: number; aadayam: number; vyayam: number; rajapujyam: number; avamanam: number }[];
};
/** Every yearly table shipped (tables/yearly/*.json), keyed by "number|shaka". */
const YEARLY: Record<string, YearTable> = Object.fromEntries(
  Object.values(import.meta.glob<YearTable>('../tables/yearly/*.json', { eager: true, import: 'default' })).map((t) => [`${t.samvatsara.number}|${t.samvatsara.shaka}`, t]),
);
export const yearlyTables = () => Object.values(YEARLY);

const graha = (id: string) => {
  const g = grahas.items.find((x) => x.id === id)!;
  return { name: { en: g.en, te: g.te ?? null }, short: { en: g.shortEn, te: g.shortTe ?? g.te ?? null } };
};

export type OutlookDeps = {
  eph: Ephemeris;
  birthChart: (b: BirthInput) => Promise<BirthChart>;
  findMuhurtham: (q: MuhurthamQuery) => Promise<MuhurthamResult>;
  masaAt: (jd: number) => Masa;
  /** Sunrise (JD UT) on a civil date at a place. */
  sunriseOf: (date: string, place: GeoPlace) => number;
  /** Tithi (1–30) current at that day's sunrise. */
  tithiAtSunrise: (date: string, place: GeoPlace) => number;
};

/** The planet's sidereal rasi at jd. */
const rasiAt = (e: Ephemeris, planet: TransitPlanet, jd: number) => rasiOf(e.position(planet, jd).longitude);

/** Next time the planet leaves its current rasi (searching up to maxDays), and the rasi it enters. */
function nextIngress(e: Ephemeris, planet: TransitPlanet, from: number, maxDays = 1100): { jd: number; rasi: number } | null {
  const r0 = rasiAt(e, planet, from);
  const step = planet === 'jupiter' ? 2 : 4;
  let a = from;
  for (let t = from + step; t <= from + maxDays; t += step) {
    if (rasiAt(e, planet, t) !== r0) {
      let lo = a, hi = t;
      while (hi - lo > 60 * SECOND) { const mid = (lo + hi) / 2; if (rasiAt(e, planet, mid) === r0) lo = mid; else hi = mid; }
      return { jd: hi, rasi: rasiAt(e, planet, hi + SECOND) };
    }
    a = t;
  }
  return null;
}

function transitView(e: Ephemeris, planet: TransitPlanet, janmaRasi: number, jd: number, tz: string): TransitView {
  const r = rasiAt(e, planet, jd);
  const t = transit(planet, janmaRasi, r);
  const next = nextIngress(e, planet, jd);
  return {
    planet, name: graha(planet).name, rasi: r, rasiName: rasiName(r), house: t.house, status: t.status,
    ...(t.phase && { phase: t.phase }),
    ...(next && { until: toLocal(next.jd, tz), nextRasi: next.rasi }),
    reasons: t.reasons,
  };
}

const span = (lord: string, start: BirthChart['dasha']['mahadashas'][number]['start'], end: BirthChart['dasha']['mahadashas'][number]['end']): DashaSpan =>
  ({ lord: lord as DashaSpan['lord'], ...graha(lord), start, end, years: vimshottari.order.find((o) => o.lord === lord)!.years });

export async function jobOutlook(deps: OutlookDeps, q: JobOutlookInput): Promise<JobOutlook> {
  const e = deps.eph;
  const chart = await deps.birthChart(q.person.birth);
  const birthNak = chart.moon.nakshatra, janma = chart.moon.rasi;
  const tz = q.place.tz;
  const noon = (date: string) => resolveLocal({ date, time: '12:00', tz }).jdUt;
  const now = noon(q.from);
  const rangeEnd = noon(addDays(q.from, q.days));

  // Dasha now.
  const mahas = chart.dasha.mahadashas;
  const found = mahas.findIndex((m) => m.start.jdUt <= now && now < m.end.jdUt);
  const mi = found >= 0 ? found : now >= mahas[mahas.length - 1]!.end.jdUt ? mahas.length - 1 : 0;
  const cur = mahas[mi]!;
  const ai = Math.max(0, cur.antardashas.findIndex((a) => a.start.jdUt <= now && now < a.end.jdUt));
  const curA = cur.antardashas[ai]!;
  const nextA = cur.antardashas[ai + 1] ?? mahas[mi + 1]?.antardashas[0];
  const nextM = mahas[mi + 1] && mahas[mi + 1]!.start.jdUt - now <= 366 ? mahas[mi + 1] : undefined;

  const transits = TRANSIT_PLANETS.map((p) => transitView(e, p, janma, now, tz));
  const goodTransits = transits.filter((t) => t.status === 'good').length;

  // Hold off on joining around a mahadasha change inside the range (sandhi).
  const holdOff: JobOutlook['holdOff'] = [];
  const sandhi = outlook.job.sandhiDays;
  for (const m of mahas) {
    if (m.start.jdUt > now - sandhi && m.start.jdUt < rangeEnd + sandhi && m !== mahas[0]) {
      const d = toLocal(m.start.jdUt, tz).date; // the change date where the person lives, like the windows
      holdOff.push({ start: addDays(d, -sandhi), end: addDays(d, sandhi), reasons: [{ ruleId: 'job.sandhi', values: { from: mahas[mahas.indexOf(m) - 1]!.lord, to: m.lord, date: d } }] });
    }
  }
  const held = (date: string) => holdOff.some((h) => date >= h.start && date <= h.end);

  // Day by day (Moon at local noon): tarabalam, chandrabalam, transits.
  const W = outlook.job.windows;
  type Day = { date: string; score: number; reasons: Reason[] };
  const days: Day[] = [];
  for (let i = 0; i < q.days; i++) {
    const date = addDays(q.from, i);
    const jd = noon(date);
    const moon = e.position('moon', jd).longitude;
    const t = tarabalam(birthNak, nakshatraOf(moon));
    const c = chandrabalam(janma, rasiOf(moon));
    const tr = TRANSIT_PLANETS.map((p) => transit(p, janma, rasiAt(e, p, jd)));
    const good = tr.filter((x) => x.status === 'good').length;
    const wt = W.weights;
    const score = t.status === 'avoid' || held(date) ? 0 : (t.status === 'good' ? wt.taraGood : wt.taraMixed) + (c.status === 'good' ? wt.chandraGood : 0) + good * wt.perGoodTransit;
    days.push({ date, score, reasons: [
      { ruleId: 'job.tarabalam', values: { tara: t.tara.number, status: t.status } },
      { ruleId: 'job.chandrabalam', values: { house: c.house, status: c.status } },
      { ruleId: 'job.transits', values: { good, of: tr.length } },
    ] });
  }
  // Runs of best days.
  const runs: { from: number; to: number; total: number }[] = [];
  for (let i = 0; i < days.length; i++) {
    if (days[i]!.score < W.minScore) continue;
    let j = i;
    while (j + 1 < days.length && days[j + 1]!.score >= W.minScore && j + 1 - i < W.maxLength) j++;
    runs.push({ from: i, to: j, total: days.slice(i, j + 1).reduce((s, d) => s + d.score, 0) });
    i = j;
  }
  const windows = runs.sort((a, b) => b.total - a.total || a.from - b.from).slice(0, W.count).sort((a, b) => a.from - b.from).map((r) => {
    const best = days.slice(r.from, r.to + 1).reduce((x, y) => (y.score > x.score ? y : x));
    const maxScore = W.weights.taraGood + W.weights.chandraGood + TRANSIT_PLANETS.length * W.weights.perGoodTransit;
    return { start: days[r.from]!.date, end: days[r.to]!.date, score: Math.round((100 * r.total) / ((r.to - r.from + 1) * maxScore)), status: (best.score >= maxScore - W.goodWithin ? 'good' : 'mixed') as Status, reasons: best.reasons };
  });

  // Joining days: the job muhurtham search, outside hold-off days.
  const mh = await deps.findMuhurtham({ event: 'job', from: q.from, days: q.days, place: q.place, people: [{ id: q.person.id, nakshatra: birthNak, rasi: janma }] });
  const joining = mh.results.filter((w) => !held(w.date)).slice(0, outlook.job.joining.count);

  const status: Status = goodTransits >= outlook.job.statusGoodTransitsAtLeast ? 'good' : 'mixed';
  const reasons: Reason[] = [
    { ruleId: 'job.status', values: { goodTransits, of: transits.length, status } },
    { ruleId: 'job.dasha', values: { mahadasha: cur.lord, antardasha: curA.lord, ...(nextM && { nextMahadasha: nextM.lord, nextDate: nextM.start.date }) } },
  ];
  const sat = transits.find((t) => t.planet === 'saturn');
  if (sat?.phase) reasons.push({ ruleId: `gochara.saturn.${sat.phase}`, values: { house: sat.house } });

  return {
    person: { id: q.person.id, nakshatra: birthNak, rasi: janma },
    approximate: chart.approximate,
    status,
    dasha: {
      mahadashas: mahas.map((m) => span(m.lord, m.start, m.end)),
      current: span(cur.lord, cur.start, cur.end),
      antardashas: cur.antardashas.map((a) => span(a.lord, a.start, a.end)),
      currentAntar: span(curA.lord, curA.start, curA.end),
      ...(nextA && { nextAntar: span(nextA.lord, nextA.start, nextA.end) }),
      ...(nextM && { nextMaha: span(nextM.lord, nextM.start, nextM.end) }),
    },
    transits,
    windows,
    joining,
    holdOff,
    reasons,
    todos: outlook.job.todos.map((id) => ({ id })),
    remedies: outlook.job.remedies,
  };
}

// Conventions are data (outlook.json year); only the ones implemented here are accepted.
if (outlook.year.ugadiRule !== 'pratipadaAtSunrise') throw new Error(`outlook.json year.ugadiRule ${outlook.year.ugadiRule} is not implemented`);
if (outlook.year.adhikaChaitra !== 'startsYear') throw new Error(`outlook.json year.adhikaChaitra ${outlook.year.adhikaChaitra} is not implemented`);

/** The first Chaitra new moon at or before jd: the start of the Ugadi year (outlook.json year.adhikaChaitra 'startsYear': an adhika Chaitra counts as the start). */
function chaitraStart(deps: OutlookDeps, jd: number): Masa {
  let m = deps.masaAt(jd);
  // Walk back to number 1; if the month before is also Chaitra (adhika), start there.
  for (let i = 0; i < 14 && m.number !== 1; i++) m = deps.masaAt(m.startNewMoon - DAY);
  const before = deps.masaAt(m.startNewMoon - DAY);
  return before.number === 1 ? before : m;
}

/**
 * The civil date a lunar month starts (Ugadi for Chaitra), outlook.json year.ugadiRule: the day whose sunrise
 * falls in shukla pratipada; if pratipada touches no sunrise (kshaya), the day it begins.
 */
function monthStartDate(deps: OutlookDeps, newMoon: number, place: GeoPlace): string {
  const pratipadaEnd = findCrossing(angles(deps.eph).elongation, 12, newMoon + SECOND, 1, 3);
  const d0 = toLocal(newMoon, place.tz).date;
  const first = deps.sunriseOf(d0, place) > newMoon ? d0 : addDays(d0, 1);
  return deps.sunriseOf(first, place) < pratipadaEnd ? first : addDays(first, -1);
}

export function yearOutlook(deps: OutlookDeps, q: YearOutlookInput): YearOutlook {
  const e = deps.eph;
  // The Chaitra in force by the end of this day; if its Ugadi is still ahead, the year is the previous one.
  let start = chaitraStart(deps, deps.sunriseOf(addDays(q.date, 1), q.place) - SECOND);
  if (q.date < monthStartDate(deps, start.startNewMoon, q.place)) start = chaitraStart(deps, start.startNewMoon - DAY);
  const sam = samvatsaraOf(start);

  // The months of this year: from this Chaitra to the next Chaitra (12, or 13 with an adhika month).
  const months: Masa[] = [];
  let m = start;
  for (let i = 0; i < 14; i++) {
    months.push(m);
    const next = deps.masaAt(m.endNewMoon + SECOND);
    if (next.number === 1 && i >= 10) { m = next; break; } // the next year's (first) Chaitra
    m = next;
  }
  const nextChaitra = m;
  const starts = [...months, nextChaitra].map((mm) => monthStartDate(deps, mm.startNewMoon, q.place));
  const ugadi = { start: starts[0]!, end: starts[starts.length - 1]! };

  const tableRow = YEARLY[`${sam.number}|${sam.shaka}`];
  const row = tableRow?.rasis.find((r) => r.rasi === q.rasi);
  const goodAtLeast = outlook.year.monthStatus.goodIfAtLeast;
  const monthViews = months.map((mm, i) => {
    const mid = (mm.startNewMoon + mm.endNewMoon) / 2;
    const tr = TRANSIT_PLANETS.map((p) => { const t = transit(p, q.rasi, rasiAt(e, p, mid)); return { planet: p, house: t.house, status: t.status }; });
    const good = tr.filter((t) => t.status === 'good').length;
    return {
      masa: { number: mm.number, name: mm.name, adhika: mm.adhika },
      start: starts[i]!,
      end: addDays(starts[i + 1]!, -1),
      status: (good >= goodAtLeast ? 'good' : 'mixed') as Status,
      transits: tr,
    };
  });
  const current = Math.max(0, months.findIndex((_, i) => q.date >= starts[i]! && q.date < starts[i + 1]!));
  const status: Status = row ? (row.aadayam >= row.vyayam ? 'good' : 'mixed') : 'mixed';
  const honour: Status = row && outlook.income.honour.goodIf === 'rajapujyamAtLeastAvamanam' && row.rajapujyam >= row.avamanam ? 'good' : 'mixed';
  return {
    samvatsara: { number: sam.number, name: sam.name, shaka: sam.shaka },
    ugadi,
    table: row && tableRow ? { aadayam: row.aadayam, vyayam: row.vyayam, rajapujyam: row.rajapujyam, avamanam: row.avamanam, scale: tableRow.scale, source: tableRow.source, honour } : null,
    status,
    months: monthViews,
    current,
    reasons: row
      ? [{ ruleId: 'year.aadayamVyayam', values: { aadayam: row.aadayam, vyayam: row.vyayam, status } }, { ruleId: 'year.rajapujyamAvamanam', values: { rajapujyam: row.rajapujyam, avamanam: row.avamanam, status: honour } }]
      : [{ ruleId: 'year.tableMissing', values: { samvatsara: sam.number, shaka: sam.shaka } }],
    todos: outlook.income.todos.map((id) => ({ id })),
    remedies: outlook.income.remedies,
  };
}

/**
 * outlook.json year.ugadiRule on the last day of Phalguna: when the Chaitra new moon falls after this sunrise and
 * shukla pratipada ends before the next sunrise (kshaya), today is Ugadi. Returns the new year's first month then.
 */
export function kshayaUgadiToday(eph: Ephemeris, masa: Masa, nextSunrise: number, masaAt: (jd: number) => Masa): Masa | null {
  if (masa.number !== 12 || masa.endNewMoon >= nextSunrise) return null;
  const next = masaAt(masa.endNewMoon + SECOND);
  if (next.number !== 1) return null;
  const pratipadaEnd = findCrossing(angles(eph).elongation, 12, masa.endNewMoon + SECOND, 1, 3);
  return pratipadaEnd < nextSunrise ? next : null;
}

/** Future tab: dasha timeline, transit milestones and a period strip over a horizon (future.json). */
export async function futureOutlook(deps: OutlookDeps, q: FutureInput): Promise<FutureOutlook> {
  const e = deps.eph;
  const chart = await deps.birthChart(q.person.birth);
  const janma = chart.moon.rasi;
  const tz = q.place.tz;
  const noon = (date: string) => resolveLocal({ date, time: '12:00', tz }).jdUt;
  const now = noon(q.from);
  const mahas = chart.dasha.mahadashas;
  const whole = q.years <= 0;
  const startJd = whole ? mahas[0]!.start.jdUt : now;
  const endJd = whole ? mahas[mahas.length - 1]!.end.jdUt : noon(`${Number(q.from.slice(0, 4)) + q.years}${q.from.slice(4)}`);
  const granularity: FutureOutlook['horizon']['granularity'] = whole || q.years > future.granularity.yearsUpTo ? 'mahadasha' : q.years <= future.granularity.monthsUpTo ? 'month' : 'year';

  const at = (jd: number) => {
    const m = mahas.find((x) => x.start.jdUt <= jd && jd < x.end.jdUt) ?? (jd < mahas[0]!.start.jdUt ? mahas[0]! : mahas[mahas.length - 1]!);
    const a = m.antardashas.find((x) => x.start.jdUt <= jd && jd < x.end.jdUt) ?? m.antardashas[0]!;
    return { m, a };
  };
  const cur = at(now);
  /** Mahadasha–antardasha pairs overlapping [a, b). */
  const segmentsIn = (a: number, b: number) => mahas.flatMap((m) => m.antardashas
    .filter((x) => x.end.jdUt > a && x.start.jdUt < b)
    .map((x) => ({ mahadasha: span(m.lord, m.start, m.end), antardasha: span(x.lord, x.start, x.end) })));

  const dashas = mahas.filter((m) => m.end.jdUt > startJd && m.start.jdUt < endJd).map((m) => ({
    ...span(m.lord, m.start, m.end),
    antardashas: m.antardashas.filter((a) => a.end.jdUt > startJd && a.start.jdUt < endJd).map((a) => span(a.lord, a.start, a.end)),
  }));

  // Period strip.
  const goodAtLeast = future.status.goodIfAtLeast;
  const transitsAt = (jd: number) => TRANSIT_PLANETS.map((p) => { const t = transit(p, janma, rasiOf(e.position(p, jd).longitude)); return { planet: p, house: t.house, status: t.status }; });
  const periods: FuturePeriod[] = [];
  if (granularity === 'mahadasha') {
    for (const m of dashas) periods.push({ start: m.start.date, end: m.end.date, mahadasha: m, antardasha: span(m.antardashas[0]?.lord ?? m.lord, m.start, m.end), segments: [] });
  } else {
    const step = granularity === 'month' ? 1 : 12;
    const [y0, m0] = q.from.split('-').map(Number) as [number, number];
    for (let i = 0; ; i += step) {
      const a = new Date(Date.UTC(y0, m0 - 1 + i, 1)), b = new Date(Date.UTC(y0, m0 - 1 + i + step, 0));
      const s0 = i === 0 ? q.from : a.toISOString().slice(0, 10);
      const e0 = b.toISOString().slice(0, 10);
      if (noon(s0) >= endJd) break;
      const mid = (noon(s0) + Math.min(noon(e0), endJd)) / 2;
      const d = at(mid);
      const tr = transitsAt(mid);
      periods.push({
        start: s0, end: e0,
        mahadasha: span(d.m.lord, d.m.start, d.m.end), antardasha: span(d.a.lord, d.a.start, d.a.end),
        segments: segmentsIn(noon(s0), Math.min(noon(e0) + 1, endJd)),
        transits: tr, status: tr.filter((x) => x.status === 'good').length >= goodAtLeast ? 'good' : 'mixed',
      });
    }
  }

  // Transit milestones (sign changes) inside the horizon.
  const milestones: TransitMilestone[] = [];
  if (!whole && q.years <= future.transitsUpTo) {
    for (const p of TRANSIT_PLANETS) {
      let jd = now;
      for (let guard = 0; guard < 200; guard++) {
        const next = nextIngress(e, p, jd);
        if (!next || next.jd >= endJd) break;
        const t = transit(p, janma, next.rasi);
        milestones.push({ planet: p, name: graha(p).name, date: toLocal(next.jd, tz).date, rasi: next.rasi, rasiName: rasiName(next.rasi), house: t.house, status: t.status, ...(t.phase && { phase: t.phase }) });
        jd = next.jd + 1;
      }
    }
    milestones.sort((a, b) => a.date.localeCompare(b.date));
  }

  return {
    person: { id: q.person.id, nakshatra: chart.moon.nakshatra, rasi: janma },
    approximate: chart.approximate,
    horizon: { from: whole ? mahas[0]!.start.date : q.from, to: toLocal(endJd, tz).date, years: q.years, granularity },
    now: {
      mahadasha: span(cur.m.lord, cur.m.start, cur.m.end), antardasha: span(cur.a.lord, cur.a.start, cur.a.end),
      transits: TRANSIT_PLANETS.map((p) => transitView(e, p, janma, now, tz)),
    },
    dashas, periods, milestones,
    reasons: [{ ruleId: 'future.now', values: { mahadasha: cur.m.lord, antardasha: cur.a.lord } }],
    remedies: future.remedies,
  };
}

/** Pratyantardashas of an antardasha: the same Vimshottari order from the antardasha lord, lengths in proportion. */
function pratyantars(a: { lord: string; start: { jdUt: number }; end: { jdUt: number } }, tz: string): DashaSpan[] {
  const order = vimshottari.order;
  const i0 = order.findIndex((o) => o.lord === a.lord);
  const len = a.end.jdUt - a.start.jdUt;
  const out: DashaSpan[] = [];
  let t = a.start.jdUt;
  for (let k = 0; k < order.length; k++) {
    const o = order[(i0 + k) % order.length]!;
    const d = (len * o.years) / vimshottari.totalYears;
    out.push(span(o.lord, toLocal(t, tz), toLocal(t + d, tz)));
    t += d;
  }
  return out;
}

/** One Future period in detail (future.json detail). */
export async function futureDetail(deps: OutlookDeps, q: FutureDetailInput): Promise<FutureDetail> {
  const e = deps.eph;
  const chart = await deps.birthChart(q.person.birth);
  const janma = chart.moon.rasi, birthNak = chart.moon.nakshatra;
  const tz = q.place.tz;
  const noon = (date: string) => resolveLocal({ date, time: '12:00', tz }).jdUt;
  const a = resolveLocal({ date: q.start, time: '00:00', tz }).jdUt;
  const b = resolveLocal({ date: addDays(q.end, 1), time: '00:00', tz }).jdUt;
  const days = Math.round(b - a);
  const mahas = chart.dasha.mahadashas;

  const dashas: FutureDetail['dashas'] = mahas.flatMap((m) => m.antardashas
    .filter((x) => x.end.jdUt > a && x.start.jdUt < b)
    .map((x) => ({
      mahadasha: span(m.lord, m.start, m.end),
      antardasha: span(x.lord, x.start, x.end),
      pratyantars: pratyantars(x, tz).filter((p) => p.end.jdUt > a && p.start.jdUt < b),
    })));

  const transits: FutureDetail['transits'] = TRANSIT_PLANETS.map((p) => {
    const r = rasiAt(e, p, a);
    const t = transit(p, janma, r);
    const changes: TransitMilestone[] = [];
    let jd = a;
    for (let guard = 0; guard < 40; guard++) {
      const next = nextIngress(e, p, jd, Math.max(30, b - jd + 2));
      if (!next || next.jd >= b) break;
      const tt = transit(p, janma, next.rasi);
      changes.push({ planet: p, name: graha(p).name, date: toLocal(next.jd, tz).date, rasi: next.rasi, rasiName: rasiName(next.rasi), house: tt.house, status: tt.status, ...(tt.phase && { phase: tt.phase }) });
      jd = next.jd + 1;
    }
    return { planet: p, name: graha(p).name, rasi: r, rasiName: rasiName(r), house: t.house, status: t.status, ...(t.phase && { phase: t.phase }), changes };
  });

  const D = future.detail;
  const goodAtLeast = future.status.goodIfAtLeast;
  const transitsAt = (jd: number) => TRANSIT_PLANETS.map((p) => { const t = transit(p, janma, rasiAt(e, p, jd)); return { planet: p, house: t.house, status: t.status }; });
  const at = (jd: number) => {
    const m = mahas.find((x) => x.start.jdUt <= jd && jd < x.end.jdUt) ?? mahas[mahas.length - 1]!;
    const x = m.antardashas.find((y) => y.start.jdUt <= jd && jd < y.end.jdUt) ?? m.antardashas[0]!;
    return { m, x };
  };
  const overall = transitsAt((a + b) / 2);
  const status: Status = overall.filter((x) => x.status === 'good').length >= goodAtLeast ? 'good' : 'mixed';

  let periods: FuturePeriod[] | undefined;
  let goodDays: FutureDetail['goodDays'];
  let lunarDays: FutureDetail['lunarDays'];
  const kind: FutureDetail['kind'] = days > D.yearsFromDays ? 'years' : days > D.monthsFromDays ? 'months' : 'days';
  if (kind !== 'days') {
    periods = [];
    const months = periods;
    const step = kind === 'years' ? 12 : 1;
    const [y0, m0] = q.start.split('-').map(Number) as [number, number];
    for (let i = 0; i < 400 * step; i += step) {
      const s0 = i === 0 ? q.start : new Date(Date.UTC(y0, m0 - 1 + i, 1)).toISOString().slice(0, 10);
      if (s0 > q.end) break;
      const endOfMonth = new Date(Date.UTC(y0, m0 - 1 + i + step, 0)).toISOString().slice(0, 10);
      const e0 = endOfMonth < q.end ? endOfMonth : q.end;
      const mid = (noon(s0) + noon(e0)) / 2;
      const d = at(mid);
      const tr = transitsAt(mid);
      months.push({
        start: s0, end: e0,
        mahadasha: span(d.m.lord, d.m.start, d.m.end), antardasha: span(d.x.lord, d.x.start, d.x.end),
        segments: [], transits: tr, status: tr.filter((x) => x.status === 'good').length >= goodAtLeast ? 'good' : 'mixed',
      });
    }
  } else {
    const good: NonNullable<FutureDetail['goodDays']> = [];
    lunarDays = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(q.start, i);
      const moon = e.position('moon', noon(date)).longitude;
      const t = tarabalam(birthNak, nakshatraOf(moon));
      const c = chandrabalam(janma, rasiOf(moon));
      if (t.status === 'good' && c.status === 'good') good.push({ date, tara: t.tara, chandraHouse: c.house });
      let tithi: number;
      try { tithi = deps.tithiAtSunrise(date, q.place); } catch { continue; }
      for (const [k, list] of Object.entries(D.lunarDays) as ['pournami' | 'amavasya' | 'ekadashi', number[]][]) {
        if (list.includes(tithi)) lunarDays.push({ date, kind: k, tithi, name: angaNames.tithi(tithi) });
      }
    }
    goodDays = good.slice(0, D.goodDays);
  }

  const lords = [...new Set(dashas.flatMap((d) => [d.mahadasha.lord, d.antardasha.lord]))];
  const lr = future.lordRemedies as Record<string, string[]>;
  const remedies = [...new Set(lords.flatMap((l) => lr[l] ?? []))];

  return {
    start: q.start, end: q.end, kind, approximate: chart.approximate,
    person: { id: q.person.id, nakshatra: birthNak, rasi: janma },
    status, dashas, transits,
    ...(periods && { periods }),
    ...(goodDays && { goodDays }),
    ...(lunarDays && { lunarDays }),
    reasons: [{ ruleId: 'future.detail', values: { goodTransits: overall.filter((x) => x.status === 'good').length, status } }],
    remedies: remedies.length ? remedies : future.remedies,
  };
}
