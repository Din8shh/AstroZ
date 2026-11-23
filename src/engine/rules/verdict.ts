// Overall marriage verdict: the score is one input, not the answer. Applies the sourced cancellations (parihara) from
// tables/match-verdict.json, counts the doshas still standing, and gives Strong / Fair / Needs a careful look —
// never 'avoid'. Koota points are never changed. Structured output only (rule ids + values); copy lives in content.
import table from '../tables/match-verdict.json';
import kootas from '../tables/kootas.json';
import type { Reason, Status } from './strength';
import type { KootaId, MatchCore, MatchSide } from './matching';

export type VerdictId = 'strong' | 'fair' | 'careful';
export type IssueId = 'nadi' | 'bhakoot' | 'gana' | 'rajju' | 'vedha' | 'kuja';
export type Cancellation = { koota: KootaId; ruleId: string; when: string };
export type Verdict = {
  id: VerdictId;
  status: Status;
  provisional: boolean;
  issues: IssueId[];
  cancellations: Cancellation[];
  /** ≤ highlights.max lines: issues, then cancellations, then strengths. */
  highlights: Reason[];
  /** Question ids (content match.ask.<id>), in order. */
  questions: string[];
  reasons: Reason[];
};

type Condition = (b: MatchSide, g: MatchSide, core: MatchCore) => boolean;
const points = (core: MatchCore, id: KootaId) => core.kootas.find((k) => k.id === id)!.points;
const countFrom = (a: number, b: number, n: number) => ((b - a + n) % n) + 1;

/** Named conditions the table refers to. A name the table uses but this file lacks is an error (tables test). */
export const CONDITIONS: Record<string, Condition> = {
  sameRasiDifferentNakshatra: (b, g) => b.rasi === g.rasi && b.nakshatra !== g.nakshatra,
  sameNakshatraDifferentRasi: (b, g) => b.nakshatra === g.nakshatra && b.rasi !== g.rasi,
  lordsFriendly: (_b, _g, core) => points(core, 'grahaMaitri') >= kootas.kootas.grahaMaitri.max,
  taraFull: (_b, _g, core) => points(core, 'tara') >= kootas.kootas.tara.max,
  brideNinthGroomFifth: (b, g) => countFrom(g.rasi, b.rasi, 12) === 9 && countFrom(b.rasi, g.rasi, 12) === 5,
  differentNakshatraAndRasi: (b, g) => b.nakshatra !== g.nakshatra && b.rasi !== g.rasi,
  exemptNakshatra: () => false, // listed but not applied (the source's lists disagree)
  sameNakshatraAndRasi: (b, g) => b.nakshatra === g.nakshatra && b.rasi === g.rasi,
};

type IssueTable = Record<string, { issueAtMost: number }>;
const ISSUE_KOOTAS = table.issues.kootas as IssueTable;

export function verdict(b: MatchSide, g: MatchSide, core: MatchCore): Verdict {
  const cancellations: Cancellation[] = [];
  const issues: IssueId[] = [];

  for (const id of Object.keys(ISSUE_KOOTAS) as KootaId[]) {
    if (points(core, id) > ISSUE_KOOTAS[id]!.issueAtMost) continue;
    const blocked = table.cancellationsUnless.some((w) => CONDITIONS[w]!(b, g, core));
    const hit = blocked ? undefined : table.cancellations
      .filter((c) => c.applied && c.kootas.includes(id))
      .flatMap((c) => c.when.filter((w) => CONDITIONS[w]!(b, g, core)).map((w) => ({ koota: id, ruleId: c.id, when: w })))[0];
    if (hit) cancellations.push(hit);
    else issues.push(id as IssueId);
  }
  if (core.rajju.present) issues.push('rajju');
  if (core.vedha.present) issues.push('vedha');
  if (core.kuja.checked && core.kuja.status !== 'good') issues.push('kuja');
  const order = table.issues.order as IssueId[];
  issues.sort((x, y) => order.indexOf(x) - order.indexOf(y));

  const v = table.verdict;
  const id: VerdictId =
    issues.length >= v.careful.issuesAtLeast || core.score < v.careful.orScoreBelow ? 'careful'
    : issues.length <= v.strong.issuesAtMost && core.score >= v.strong.scoreAtLeast ? 'strong'
    : 'fair';

  const strengths: Reason[] = [];
  for (const s of table.highlights.strengths) {
    if (s === 'rajju' || s === 'vedha') { if (!core[s].present) strengths.push({ ruleId: `verdict.strength.${s}`, values: {} }); continue; }
    if (s === 'kuja') {
      if (core.kuja.checked && core.kuja.status === 'good') strengths.push({ ruleId: 'verdict.strength.kuja', values: { balanced: core.kuja.bride.present && core.kuja.groom.present } });
      continue;
    }
    const k = core.kootas.find((x) => x.id === s)!;
    if (k.points >= k.max) strengths.push({ ruleId: `verdict.strength.${s}`, values: { points: k.points, max: k.max } });
  }
  const highlights: Reason[] = [
    ...issues.map((i) => ({ ruleId: `verdict.issue.${i}`, values: issueValues(i, core) })),
    ...cancellations.map((c) => ({ ruleId: `verdict.cancelled.${c.koota}`, values: { rule: c.ruleId, when: c.when } })),
    ...strengths,
  ].slice(0, table.highlights.max);

  const questions = [
    ...issues,
    ...(cancellations.length ? ['cancelled'] : []),
    ...(core.score < table.questions.lowScoreBelow ? ['lowScore'] : []),
    ...(!core.kuja.checked ? ['fullCharts'] : []),
  ];

  return {
    id, status: v.status[id] as Status, provisional: table.provisional, issues, cancellations, highlights, questions,
    reasons: [{ ruleId: `verdict.${id}`, values: { score: core.score, max: core.max, issues: issues.length, cancelled: cancellations.map((c) => c.koota) } }],
  };
}

function issueValues(i: IssueId, core: MatchCore): Record<string, unknown> {
  if (i === 'rajju' || i === 'vedha' || i === 'kuja') return {};
  const k = core.kootas.find((x) => x.id === i)!;
  return { points: k.points, max: k.max, ...k.reasons[0]!.values };
}
