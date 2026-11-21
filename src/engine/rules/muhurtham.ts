// Muhurtham scorer over candidate windows (telugu-jyotisha skill, "Muhurtham scoring order").
// Pure functions over a precomputed day context; every list, orb, weight and band comes from tables/muhurtham.json.
// Output is structured: windows with score, status and reasons {ruleId, values} — never prose.
import table from '../tables/muhurtham.json';
import karanas from '../tables/karanas.json';
import type { AngaSpan } from '../core/panchangam';
import type { DayPeriod, PeriodKind } from '../core/dayPeriods';
import { chandrabalam, tarabalam, type Reason, type Status } from './strength';

export type EventId = keyof typeof table.events;
export const EVENT_IDS = Object.keys(table.events) as EventId[];
export type Door = 'east' | 'north' | 'west' | 'south';
export type VaraId = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type Participant = { id: string; nakshatra: number; rasi: number };

/** One panchangam day (sunrise to next sunrise), as JD UT, computed by the engine. */
export type DayContext = {
  date: string;
  sunrise: number;
  sunset: number;
  nextSunrise: number;
  vara: VaraId;
  masa: { number: number; adhika: boolean; kshaya: boolean };
  /** Tithi current at sunrise (1–30): month rules are judged at sunrise. */
  sunriseTithi: number;
  sunRasi: number;
  /** Angular distance from the Sun and retrograde flag, at sunrise. */
  planets: Record<'venus' | 'jupiter', { separation: number; retrograde: boolean }>;
  tithi: AngaSpan[];
  nakshatra: AngaSpan[];
  yoga: AngaSpan[];
  karana: AngaSpan[];
  /** Moon rasi spans covering the day. */
  moonRasi: { start: number; end: number; index: number }[];
  /** Day periods that touch this day (including any that spill over from the previous day). */
  periods: DayPeriod[];
};

export type Window = {
  start: number;
  end: number;
  score: number;
  status: Status;
  /** Every reason, strongest first (values.impact: signed points). */
  reasons: Reason[];
  panchanga: { tithi: number; nakshatra: number; yoga: number; karana: number; moonRasi: number };
  people: { id: string; tara: number; taraStatus: Status; house: number; chandraStatus: Status }[];
  door?: { door: Door; group: string | null; fits: boolean };
};

export type DayResult = { best: Window | null; windows: Window[]; excluded: Reason[] };

type EventRule = {
  window: 'daytime' | 'fullDay';
  nakshatras: { good: number[]; avoid: number[]; strict: boolean };
  tithis: { good: number[]; avoid: number[]; fromDoor?: boolean };
  pakshaPreference: string;
  varas: { good: string[]; avoid: string[] };
  avoidKaranas: string[];
  exclude: { adhika: boolean; kshaya: boolean; chaturmas: boolean; kharmas: boolean; combust: string[]; pitruPaksha: boolean; months: number[] | null };
};
const EVENTS = table.events as unknown as Record<EventId, EventRule>;
const W = table.weights;
const G = table.general as { avoidTithis: number[]; avoidYogas: number[]; avoidKaranas: string[]; removePeriods: string[]; preferPeriods: string[] };
const MINUTE = 1 / 1440;
const pakshaTithi = (t: number) => (t === 30 ? 30 : ((t - 1) % 15) + 1);
const karanaName = (k: number): string => {
  const fixed = karanas.fixed.find((x) => x.k === k);
  return fixed ? fixed.en : karanas.movable[(k - 2) % karanas.movable.length]!.en;
};
const at = (spans: AngaSpan[], t: number) => spans.find((s) => t >= s.start && t < s.end) ?? spans[spans.length - 1]!;
const rasiAt = (spans: DayContext['moonRasi'], t: number) => (spans.find((s) => t >= s.start && t < s.end) ?? spans[spans.length - 1]!).index;

/** Day-level hard exclusions (month rules, combust planets) for an event. Empty = the day can hold windows. */
export type DayHead = Pick<DayContext, 'masa' | 'sunriseTithi' | 'sunRasi' | 'planets'>;
export function dayExclusions(event: EventId, d: DayHead): Reason[] {
  const ev = EVENTS[event];
  const x = ev.exclude;
  const out: Reason[] = [];
  const m = d.masa;
  if (x.adhika && m.adhika) out.push({ ruleId: 'mh.x.adhika', values: { masa: m.number } });
  if (x.kshaya && m.kshaya) out.push({ ruleId: 'mh.x.kshaya', values: { masa: m.number } });
  if (x.months && !x.months.includes(m.number)) out.push({ ruleId: 'mh.x.month', values: { masa: m.number, allowed: x.months } });
  if (x.chaturmas) {
    const c = table.chaturmas;
    const ord = (masa: number, tithi: number) => masa * 30 + tithi;
    const now = ord(m.number, d.sunriseTithi);
    if (!m.adhika && now >= ord(c.from.masa, c.from.tithi) && now < ord(c.to.masa, c.to.tithi)) out.push({ ruleId: 'mh.x.chaturmas', values: { masa: m.number, tithi: d.sunriseTithi } });
  }
  if (x.kharmas && table.kharmas.sunRasis.includes(d.sunRasi)) out.push({ ruleId: 'mh.x.kharmas', values: { sunRasi: d.sunRasi } });
  if (x.pitruPaksha) {
    const p = table.pitruPaksha;
    if (m.number === p.masa && d.sunriseTithi >= p.tithis[0]! && d.sunriseTithi <= p.tithis[1]!) out.push({ ruleId: 'mh.x.pitruPaksha', values: { masa: m.number, tithi: d.sunriseTithi } });
  }
  for (const planet of x.combust as ('venus' | 'jupiter')[]) {
    const p = d.planets[planet];
    const orb = table.combust.orbs[planet][p.retrograde ? 'retrograde' : 'direct'];
    if (p.separation < orb) out.push({ ruleId: 'mh.x.combust', values: { planet, separation: Math.round(p.separation * 10) / 10, orb } });
  }
  return out;
}

type Scored = { excluded: Reason | null; earned: number; possible: number; reasons: Reason[]; mixed: boolean; panchanga: Window['panchanga']; people: Window['people']; door?: Window['door'] };

/** Score the stretch [a, b) in which tithi, nakshatra, yoga, karana and Moon rasi are constant. */
function scoreSegment(event: EventId, d: DayContext, a: number, b: number, people: Participant[], door?: Door): Scored {
  const ev = EVENTS[event];
  const mid = (a + b) / 2;
  const tithi = at(d.tithi, mid).number, nakshatra = at(d.nakshatra, mid).number, yoga = at(d.yoga, mid).number, karana = at(d.karana, mid).number;
  const moonRasi = rasiAt(d.moonRasi, mid);
  const pt = pakshaTithi(tithi);
  const panchanga = { tithi, nakshatra, yoga, karana, moonRasi };
  const reasons: Reason[] = [];
  let earned = 0, possible = 0, mixed = false;
  const fail = (ruleId: string, values: Record<string, unknown>): Scored => ({ excluded: { ruleId, values }, earned: 0, possible: 1, reasons: [], mixed: true, panchanga, people: [] });
  const add = (ruleId: string, values: Record<string, unknown>, got: number, max: number) => {
    earned += got; possible += max;
    reasons.push({ ruleId, values: { ...values, impact: got } });
  };

  // 1. Hard exclusions inside the day.
  for (const kind of G.removePeriods as PeriodKind[]) {
    const p = d.periods.find((q) => q.kind === kind && q.start < b && q.end > a);
    if (p) return fail('mh.x.period', { kind });
  }
  if (G.avoidTithis.includes(tithi) || G.avoidTithis.includes(pt) || ev.tithis.avoid.includes(pt)) return fail('mh.x.tithi', { tithi });
  if (G.avoidYogas.includes(yoga)) return fail('mh.x.yoga', { yoga });
  const kName = karanaName(karana);
  if (G.avoidKaranas.includes(kName) || ev.avoidKaranas.includes(kName)) return fail('mh.x.karana', { karana });
  if (ev.nakshatras.avoid.includes(nakshatra) || (ev.nakshatras.strict && !ev.nakshatras.good.includes(nakshatra))) return fail('mh.x.nakshatra', { nakshatra });
  if (ev.varas.avoid.includes(d.vara)) return fail('mh.x.vara', { vara: d.vara });
  const ppl: Window['people'] = [];
  for (const p of people) {
    const t = tarabalam(p.nakshatra, nakshatra), c = chandrabalam(p.rasi, moonRasi);
    if (table.personal.taraAvoidExcludes && t.status === 'avoid') return fail('mh.x.tarabalam', { person: p.id, tara: t.tara.number });
    if (table.personal.chandraAvoidExcludes && c.status === 'avoid') return fail('mh.x.chandrabalam', { person: p.id, house: c.house });
    ppl.push({ id: p.id, tara: t.tara.number, taraStatus: t.status, house: c.house, chandraStatus: c.status });
  }

  // 2. Panchanga shuddhi.
  const nGood = ev.nakshatras.good.includes(nakshatra);
  add('mh.nakshatra', { nakshatra, quality: nGood ? 'good' : 'neutral', event }, nGood ? W.nakshatra.good : W.nakshatra.neutral, W.nakshatra.good);

  let doorInfo: Window['door'];
  if (ev.tithis.fromDoor) {
    if (door) {
      const entry = table.events.gruhapravesam.entry;
      const group = entry.byDoor[door] as string | null;
      const tithis = group ? (entry.groups as Record<string, number[]>)[group]! : [];
      const fits = tithis.includes(pt);
      if (group && !fits && entry.strict) return fail('mh.x.door', { door, group, tithi });
      doorInfo = { door, group, fits };
      if (group) add('mh.door', { door, group, tithi, fits }, fits ? W.tithi.good : W.tithi.neutral, W.tithi.good);
    }
  } else if (ev.tithis.good.length) {
    const tGood = ev.tithis.good.includes(pt);
    add('mh.tithi', { tithi, quality: tGood ? 'good' : 'neutral', event }, tGood ? W.tithi.good : W.tithi.neutral, W.tithi.good);
  }
  if (ev.pakshaPreference === 'shukla') add('mh.paksha', { paksha: tithi <= 15 ? 'shukla' : 'krishna' }, tithi <= 15 ? W.shuklaBonus : 0, W.shuklaBonus);

  const vGood = ev.varas.good.includes(d.vara);
  add('mh.vara', { vara: d.vara, quality: vGood ? 'good' : 'neutral', event }, vGood ? W.vara.good : W.vara.neutral, W.vara.good);
  add('mh.yoga', { yoga }, W.yoga, W.yoga);
  add('mh.karana', { karana }, W.karana, W.karana);

  // 3. Personal strength.
  for (const p of ppl) {
    const tw = p.taraStatus === 'good' ? W.tarabalam.good : W.tarabalam.mixed;
    add('mh.tarabalam', { person: p.id, tara: p.tara, status: p.taraStatus }, tw, W.tarabalam.good);
    const cw = p.chandraStatus === 'good' ? W.chandrabalam.good : W.chandrabalam.mixed;
    add('mh.chandrabalam', { person: p.id, house: p.house, status: p.chandraStatus }, cw, W.chandrabalam.good);
    if (p.taraStatus !== 'good' || p.chandraStatus !== 'good') mixed = true;
  }

  // 4. Preferred periods.
  const pref = d.periods.find((q) => (G.preferPeriods as PeriodKind[]).includes(q.kind) && q.start < b && q.end > a);
  add('mh.preferred', { kind: pref?.kind ?? null, name: pref?.name ?? null }, pref ? W.preferredPeriod : 0, W.preferredPeriod);

  return { excluded: null, earned, possible, reasons, mixed, panchanga, people: ppl, ...(doorInfo && { door: doorInfo }) };
}

/** Rank reasons by size of effect; the gaps (points not earned) count as negatives so a weak point can surface. */
function rankReasons(reasons: Reason[], max: Record<string, number>): Reason[] {
  const strength = (r: Reason) => {
    const got = r.values.impact as number;
    const full = max[r.ruleId] ?? got;
    return got >= full ? got : -(full - got) * 1.5; // a shortfall is worth more attention than an equal gain
  };
  return [...reasons].filter((r) => (r.values.impact as number) > 0 || (max[r.ruleId] ?? 0) > 0).sort((x, y) => Math.abs(strength(y)) - Math.abs(strength(x)));
}

/** All windows of one day for an event, and the best one. */
export function scoreDay(event: EventId, d: DayContext, people: Participant[], door?: Door): DayResult {
  const dayX = dayExclusions(event, d);
  if (dayX.length) return { best: null, windows: [], excluded: dayX };

  const ev = EVENTS[event];
  const from = d.sunrise, to = ev.window === 'daytime' ? d.sunset : d.nextSunrise;
  // Every instant where something that scores can change.
  const cuts = new Set<number>([from, to]);
  const addCut = (t: number) => { if (t > from && t < to) cuts.add(t); };
  for (const spans of [d.tithi, d.nakshatra, d.yoga, d.karana]) for (const s of spans) { addCut(s.start); addCut(s.end); }
  for (const s of d.moonRasi) { addCut(s.start); addCut(s.end); }
  for (const p of d.periods) { addCut(p.start); addCut(p.end); }
  const edges = [...cuts].sort((x, y) => x - y);

  const maxOf: Record<string, number> = {
    'mh.nakshatra': W.nakshatra.good, 'mh.tithi': W.tithi.good, 'mh.door': W.tithi.good, 'mh.paksha': W.shuklaBonus, 'mh.vara': W.vara.good,
    'mh.tarabalam': W.tarabalam.good, 'mh.chandrabalam': W.chandrabalam.good, 'mh.preferred': W.preferredPeriod, 'mh.yoga': W.yoga, 'mh.karana': W.karana,
  };
  const windows: Window[] = [];
  const excludedTime = new Map<string, { time: number; values: Record<string, unknown> }>();
  let run: { start: number; end: number; s: Scored; score: number } | null = null;
  const flush = () => {
    if (!run) return;
    const minutes = (run.end - run.start) / MINUTE;
    if (minutes >= table.minWindowMinutes && run.score >= table.bands.list) {
      const reasons = rankReasons(run.s.reasons, maxOf);
      reasons.push({ ruleId: 'mh.clear', values: { kinds: G.removePeriods, impact: 0 } });
      // A short window is worth saying, unless it is a whole preferred period (Abhijit is ~48 min by definition).
      const inPreferred = run.s.reasons.some((r) => r.ruleId === 'mh.preferred' && r.values.kind);
      if (minutes < W.shortWindowMinutes && !inPreferred) reasons.splice(1, 0, { ruleId: 'mh.short', values: { minutes: Math.round(minutes), impact: 0 } });
      windows.push({
        start: run.start, end: run.end, score: run.score,
        status: run.score >= table.bands.good && !run.s.mixed ? 'good' : 'mixed',
        reasons, panchanga: run.s.panchanga, people: run.s.people, ...(run.s.door && { door: run.s.door }),
      });
    }
    run = null;
  };
  for (let i = 0; i + 1 < edges.length; i++) {
    const a = edges[i]!, b = edges[i + 1]!;
    if (b - a < 1 / 86_400) continue;
    const s = scoreSegment(event, d, a, b, people, door);
    if (s.excluded) {
      flush();
      const prev = excludedTime.get(s.excluded.ruleId);
      excludedTime.set(s.excluded.ruleId, { time: (prev?.time ?? 0) + (b - a), values: prev?.values ?? s.excluded.values });
      continue;
    }
    const score = Math.round((100 * s.earned) / s.possible);
    const same = run && run.score === score && JSON.stringify(run.s.panchanga) === JSON.stringify(s.panchanga) && run.s.mixed === s.mixed;
    if (run && same) run.end = b;
    else { flush(); run = { start: a, end: b, s, score }; }
  }
  flush();

  const best = windows.reduce<Window | null>((top, w) => (!top || w.score > top.score || (w.score === top.score && w.end - w.start > top.end - top.start) ? w : top), null);
  // Why a day has nothing: the exclusion that took the most time.
  const excluded = best ? [] : [...excludedTime.entries()].sort((x, y) => y[1].time - x[1].time).slice(0, 1).map(([ruleId, v]) => ({ ruleId, values: v.values }));
  return { best, windows, excluded };
}
