// Marriage matching: Ashtakoota (eight kootas, 36 points), Rajju, Vedha, Kuja dosha.
// Every classification and matrix comes from tables (kootas.json, doshas.json, rasis.json, match-guidance.json).
// Readings are structured: status, score, reasons with rule ids and values, todo ids, remedy ids. No prose.
import kootas from '../tables/kootas.json';
import doshas from '../tables/doshas.json';
import rasis from '../tables/rasis.json';
import guidance from '../tables/match-guidance.json';
import type { Reason, Status } from './strength';

export type KootaId = 'varna' | 'vashya' | 'tara' | 'yoni' | 'grahaMaitri' | 'gana' | 'bhakoot' | 'nadi';
export const KOOTA_ORDER: KootaId[] = ['varna', 'vashya', 'tara', 'yoni', 'grahaMaitri', 'gana', 'bhakoot', 'nadi'];

/** One partner as the rules see them: Moon placement, plus Mars/lagna when a chart exists. */
export type MatchSide = {
  nakshatra: number; // 1–27
  rasi: number; // 1–12 (Moon)
  /** Degrees into the Moon's rasi (Vashya splits Dhanus/Makara at 15°). */
  moonDegree: number;
  /** Names basis: the span of degrees the Moon could be in (the whole pada). A split rasi straddled by it makes Vashya uncertain. */
  moonDegreeRange?: [number, number];
  /** Present only with a birth chart. */
  mars?: { rasi: number };
  /** Present only when the birth time is known. */
  lagnaRasi?: number;
};

export type KootaResult = { id: KootaId; points: number; max: number; status: Status; reasons: Reason[] };

/** `trigger`: the reference point (lagna checked first) and house that put Mars in a dosha position. */
export type KujaSide = { fromLagna?: number; fromMoon?: number; present: boolean; trigger?: { from: 'lagna' | 'moon'; house: number } };
export type KujaResult =
  | { checked: false; reasons: Reason[] }
  | { checked: true; fromLagna: boolean; bride: KujaSide; groom: KujaSide; status: Status; reasons: Reason[] };

export type MatchCore = {
  score: number;
  max: number;
  status: Status;
  kootas: KootaResult[];
  rajju: { present: boolean; status: Status; reasons: Reason[] };
  vedha: { present: boolean; status: Status; reasons: Reason[] };
  kuja: KujaResult;
};

const T = kootas.kootas;
const statusOf = (points: number, max: number): Status => (points >= max ? 'good' : points <= 0 ? 'avoid' : 'mixed');
const lordOf = (rasi: number) => rasis.items[rasi - 1]!.lord;
/** Inclusive count from a to b around a circle of n (a → a is 1). */
const countFrom = (a: number, b: number, n: number) => ((b - a + n) % n) + 1;

function koota(id: KootaId, points: number, values: Record<string, unknown>): KootaResult {
  const max = T[id].max;
  return { id, points, max, status: statusOf(points, max), reasons: [{ ruleId: `koota.${id}`, values: { ...values, points, max } }] };
}

function vashyaGroup(s: MatchSide): string {
  const groups = T.vashya.byRasi[s.rasi - 1]!;
  return groups.length > 1 && s.moonDegree >= T.vashya.splitAtDegree ? groups[1]! : groups[0]!;
}

/** True when the Moon's possible span crosses the Vashya split inside a split rasi (the group can't be decided). */
function vashyaUncertain(s: MatchSide): boolean {
  const groups = T.vashya.byRasi[s.rasi - 1]!;
  const r = s.moonDegreeRange;
  return groups.length > 1 && !!r && r[0] < T.vashya.splitAtDegree && r[1] > T.vashya.splitAtDegree;
}

export function ashtakoota(bride: MatchSide, groom: MatchSide): KootaResult[] {
  const idx = (order: readonly string[], v: string) => order.indexOf(v);

  const vb = T.varna.byRasi[bride.rasi - 1]!, vg = T.varna.byRasi[groom.rasi - 1]!;
  const varna = T.varna.matrix[idx(T.varna.order, vb)]![idx(T.varna.order, vg)]!;

  const wb = vashyaGroup(bride), wg = vashyaGroup(groom);
  const vashya = T.vashya.matrix[idx(T.vashya.order, wb)]![idx(T.vashya.order, wg)]!;

  const taraOf = (count: number) => count % T.tara.cycle || T.tara.cycle;
  const brideToGroom = taraOf(countFrom(bride.nakshatra, groom.nakshatra, 27));
  const groomToBride = taraOf(countFrom(groom.nakshatra, bride.nakshatra, 27));
  const good = (t: number) => !T.tara.unfavourableRemainders.includes(t);
  const tara = (good(brideToGroom) ? T.tara.pointsPerDirection : 0) + (good(groomToBride) ? T.tara.pointsPerDirection : 0);

  const yb = T.yoni.byNakshatra[bride.nakshatra - 1]!, yg = T.yoni.byNakshatra[groom.nakshatra - 1]!;
  const yoni = T.yoni.matrix[idx(T.yoni.order, yb)]![idx(T.yoni.order, yg)]!;

  const lb = lordOf(bride.rasi), lg = lordOf(groom.rasi);
  const grahaMaitri = T.grahaMaitri.matrix[idx(T.grahaMaitri.order, lb)]![idx(T.grahaMaitri.order, lg)]!;

  const gb = T.gana.byNakshatra[bride.nakshatra - 1]!, gg = T.gana.byNakshatra[groom.nakshatra - 1]!;
  const gana = T.gana.matrix[idx(T.gana.order, gb)]![idx(T.gana.order, gg)]!;

  const bToG = countFrom(bride.rasi, groom.rasi, 12), gToB = countFrom(groom.rasi, bride.rasi, 12);
  const pair = [bToG, gToB].sort((a, b) => a - b);
  const bhakootDosha = T.bhakoot.doshaDistances.some(([a, b]) => pair[0] === a && pair[1] === b);
  const bhakoot = bhakootDosha ? 0 : T.bhakoot.max;

  const nb = T.nadi.byNakshatra[bride.nakshatra - 1]!, ng = T.nadi.byNakshatra[groom.nakshatra - 1]!;
  const nadi = T.nadi.matrix[idx(T.nadi.order, nb)]![idx(T.nadi.order, ng)]!;

  return [
    koota('varna', varna, { bride: vb, groom: vg }),
    koota('vashya', vashya, { bride: wb, groom: wg, uncertain: vashyaUncertain(bride) || vashyaUncertain(groom) }),
    koota('tara', tara, { brideToGroom, groomToBride }),
    koota('yoni', yoni, { bride: yb, groom: yg }),
    koota('grahaMaitri', grahaMaitri, { bride: lb, groom: lg }),
    koota('gana', gana, { bride: gb, groom: gg }),
    koota('bhakoot', bhakoot, { brideRasi: bride.rasi, groomRasi: groom.rasi, distance: pair, sameLord: lb === lg }),
    koota('nadi', nadi, { bride: nb, groom: ng }),
  ];
}

export function bandOf(score: number): Status {
  return score >= kootas.bands.good ? 'good' : score >= kootas.bands.mixed ? 'mixed' : 'avoid';
}

export function rajju(bride: MatchSide, groom: MatchSide) {
  const rb = doshas.rajju.byNakshatra[bride.nakshatra - 1]!, rg = doshas.rajju.byNakshatra[groom.nakshatra - 1]!;
  const present = rb === rg;
  return { present, status: (present ? 'mixed' : 'good') as Status, reasons: [{ ruleId: 'dosha.rajju', values: { bride: rb, groom: rg, brideNakshatra: bride.nakshatra, groomNakshatra: groom.nakshatra, present } }] };
}

export function vedha(bride: MatchSide, groom: MatchSide) {
  const a = bride.nakshatra, b = groom.nakshatra;
  const present = doshas.vedha.pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return { present, status: (present ? 'mixed' : 'good') as Status, reasons: [{ ruleId: 'dosha.vedha', values: { brideNakshatra: a, groomNakshatra: b, present } }] };
}

function kujaSide(s: MatchSide, useLagna: boolean): KujaSide {
  if (!s.mars) return { present: false };
  const house = (from: number) => countFrom(from, s.mars!.rasi, 12);
  const fromMoon = house(s.rasi);
  const fromLagna = useLagna && s.lagnaRasi !== undefined ? house(s.lagnaRasi) : undefined;
  const hit = (h: number | undefined) => h !== undefined && doshas.kuja.houses.includes(h);
  const trigger = hit(fromLagna) ? { from: 'lagna' as const, house: fromLagna! } : hit(fromMoon) ? { from: 'moon' as const, house: fromMoon } : undefined;
  return { fromMoon, ...(fromLagna !== undefined && { fromLagna }), present: !!trigger, ...(trigger && { trigger }) };
}

export function kuja(bride: MatchSide, groom: MatchSide): KujaResult {
  if (!bride.mars || !groom.mars) return { checked: false, reasons: [{ ruleId: 'dosha.kuja.notChecked', values: { reason: 'noChart' } }] };
  // Both partners are checked on the same basis: from lagna only when BOTH birth times are known (doshas.json kuja.lagnaOnlyWhenBoth).
  const fromLagna = doshas.kuja.lagnaOnlyWhenBoth ? bride.lagnaRasi !== undefined && groom.lagnaRasi !== undefined : true;
  const b = kujaSide(bride, fromLagna), g = kujaSide(groom, fromLagna);
  const balanced = doshas.kuja.bothBalance && b.present && g.present;
  const status: Status = !b.present && !g.present ? 'good' : balanced ? 'good' : 'mixed';
  return {
    checked: true, fromLagna, bride: b, groom: g, status,
    reasons: [{ ruleId: balanced ? 'dosha.kuja.balanced' : b.present || g.present ? 'dosha.kuja.present' : 'dosha.kuja.absent', values: { bride: b, groom: g, fromLagna } }],
  };
}

export function matchCore(bride: MatchSide, groom: MatchSide): MatchCore {
  const ks = ashtakoota(bride, groom);
  const score = ks.reduce((sum, k) => sum + k.points, 0);
  return { score, max: kootas.total, status: bandOf(score), kootas: ks, rajju: rajju(bride, groom), vedha: vedha(bride, groom), kuja: kuja(bride, groom) };
}

/** To-do and remedy ids for a result (match-guidance.json). */
export function guidanceFor(core: MatchCore, namesOnly: boolean) {
  const todos = namesOnly ? guidance.todos.names : guidance.todos[core.status];
  const kujaPresent = core.kuja.checked && core.kuja.status !== 'good';
  return { todos: todos.map((id) => ({ id })), remedies: kujaPresent ? guidance.remedies.kuja : [] };
}
