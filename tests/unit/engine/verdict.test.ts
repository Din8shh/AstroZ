// Overall marriage verdict (rules/verdict.ts, tables/match-verdict.json — provisional, pandit review pending).
import { describe, expect, it } from 'vitest';
import cases from '../../fixtures/match-verdict-cases.json';
import table from '../../../src/engine/tables/match-verdict.json';
import en from '../../../src/content/en.json';
import { KOOTA_ORDER, ashtakoota, matchCore, type MatchSide } from '../../../src/engine/rules/matching';
import { CONDITIONS, verdict } from '../../../src/engine/rules/verdict';

const NAK = 40 / 3, PADA = 10 / 3;
/** The Moon at the middle of a pada. */
const at = (nakshatra: number, pada: number): MatchSide => {
  const lon = (nakshatra - 1) * NAK + (pada - 0.5) * PADA;
  return { nakshatra, rasi: Math.floor(lon / 30) + 1, moonDegree: lon % 30 };
};

describe('verdict worked cases (tests/fixtures/match-verdict-cases.json)', () => {
  for (const c of cases.cases) {
    it(c.id, () => {
      const b = at(c.bride.nakshatra, c.bride.pada), g = at(c.groom.nakshatra, c.groom.pada);
      const core = matchCore(b, g);
      const v = verdict(b, g, core);
      const e = c.expected as typeof c.expected & { kootas?: number[]; highlights?: string[] };
      if (e.kootas) expect(core.kootas.map((k) => k.points)).toEqual(e.kootas);
      expect(core.score).toBe(e.score);
      expect(v.id).toBe(e.verdict);
      expect(v.issues).toEqual(e.issues);
      expect(v.cancellations.map((x) => `${x.koota}:${x.ruleId}:${x.when}`)).toEqual(e.cancellations);
      if (e.highlights) expect(v.highlights.map((h) => h.ruleId)).toEqual(e.highlights);
    });
  }
});

describe('verdict over every pada pair', () => {
  const sides: MatchSide[] = [];
  for (let n = 1; n <= 27; n++) for (let p = 1; p <= 4; p++) sides.push(at(n, p));

  it('is never avoid, never changes koota points, and is consistent with its own issues', () => {
    for (const b of sides) for (const g of sides) {
      const core = matchCore(b, g);
      const v = verdict(b, g, core);
      expect(v.status).not.toBe('avoid');
      expect(core.kootas.map((k) => k.points)).toEqual(ashtakoota(b, g).map((k) => k.points));
      if (v.id === 'strong') expect(v.issues).toHaveLength(0);
      if (v.issues.length >= table.verdict.careful.issuesAtLeast) expect(v.id).toBe('careful');
      expect(v.highlights.length).toBeLessThanOrEqual(table.highlights.max);
      for (const c of v.cancellations) expect(v.issues).not.toContain(c.koota);
    }
  });
});

describe('match-verdict.json', () => {
  it('is marked provisional with a source', () => {
    expect(table.provisional).toBe(true);
    expect(table.source).toMatch(/onlinejyotish/);
  });
  it('every condition name has an implementation; unused rules say why', () => {
    for (const w of table.cancellationsUnless) expect(CONDITIONS[w], w).toBeTypeOf('function');
    for (const c of table.cancellations) {
      for (const w of c.when) expect(CONDITIONS[w], `${c.id}.${w}`).toBeTypeOf('function');
      for (const k of c.kootas) expect(KOOTA_ORDER).toContain(k);
      expect(c.source.length).toBeGreaterThan(10);
      if (!c.applied) expect((c as { whyNot?: string }).whyNot, c.id).toBeTruthy();
    }
  });
  it('never applies a varna- (caste-) based rule', () => {
    const byVarna = table.cancellations.find((c) => c.id === 'byVarna')!;
    expect(byVarna.applied).toBe(false);
  });
  it('every verdict, issue, cancellation, strength and question has copy', () => {
    const keys = new Set(Object.keys(en));
    for (const id of ['strong', 'fair', 'careful']) expect(keys.has(`verdict.${id}`), id).toBe(true);
    for (const id of [...table.issues.order, 'cancelled', 'lowScore', 'fullCharts']) expect(keys.has(`match.ask.${id}`), id).toBe(true);
    for (const id of table.issues.order) expect(keys.has(`verdict.issue.${id}`), id).toBe(true);
    for (const id of table.highlights.strengths) expect(keys.has(`verdict.strength.${id}`), id).toBe(true);
    for (const k of Object.keys(table.issues.kootas)) expect(keys.has(`verdict.cancelled.${k}`), k).toBe(true);
    for (const c of table.cancellations) expect(keys.has(`verdict.rule.${c.id}`), c.id).toBe(true);
  });
});
