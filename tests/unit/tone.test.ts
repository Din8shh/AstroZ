// SPEC §8 / CLAUDE.md content rules for doshas and remedies:
// calm and factual, never "do not marry", no predictions of harm, no guarantees, remedies simple and free only.
import { describe, expect, it } from 'vitest';
import te from '../../src/content/te.json';
import en from '../../src/content/en.json';
import remedies from '../../src/content/remedies.json';

const RESULT_PREFIXES = ['dosha.', 'match.', 'note.', 'todo.', 'band.', 'verdict.', 'why.', 'share.', 'today.chandraText', 'today.taraText'];
const pick = (cat: Record<string, unknown>) =>
  Object.entries(cat).filter(([k, v]) => typeof v === 'string' && RESULT_PREFIXES.some((p) => k.startsWith(p))) as [string, string][];

const FORBIDDEN_EN = [
  /\b(do not|don't|must not|should not|cannot|can't|never) marry\b/i, /\bavoid (this )?marriage\b/i,
  /\b(death|die|dies|dying|widow\w*|divorce\w*|separation|separate)\b/i, /\b(danger\w*|disaster\w*|curse\w*|doom\w*|ruin\w*|misfortune|bad luck)\b/i,
  /\b(illness|disease|childless\w*|infertil\w*|accident\w*)\b/i, /\b(guarantee\w*|certainly will|will definitely)\b/i,
];
const FORBIDDEN_TE = ['చేసుకోకండి', 'చేసుకోవద్దు', 'మరణ', 'చావు', 'విధవ', 'విడాకు', 'ప్రమాద', 'శాప', 'నాశన', 'రోగ', 'సంతానం లేదు', 'ఖచ్చితంగా జరుగుతుంది'];
// Present-dosha copy must send people to elders / an astrologer rather than decide for them.
const MUST_DISCUSS = ['dosha.rajju.present', 'dosha.vedha.present', 'dosha.kuja.present', 'dosha.kuja.balanced', 'note.nadi.avoid', 'verdict.text.fairIssue', 'verdict.text.careful'];

describe('dosha and result copy follows the tone rules (SPEC §8)', () => {
  it.each(pick(en))('en %s', (_k, v) => {
    for (const re of FORBIDDEN_EN) expect(v, `matches ${re}`).not.toMatch(re);
  });
  it.each(pick(te))('te %s', (_k, v) => {
    for (const w of FORBIDDEN_TE) expect(v.includes(w), `contains ${w}`).toBe(false);
    for (const re of FORBIDDEN_EN) expect(v, `matches ${re}`).not.toMatch(re); // pending English placeholders too
  });
  it.each(MUST_DISCUSS)('%s points to elders or an astrologer', (k) => {
    expect((en as Record<string, string>)[k]).toMatch(/\b(elders?|astrologer)\b/i);
    const v = (te as unknown as Record<string, string>)[k]!;
    const pending = ((te as { $pending?: string[] }).$pending ?? []).includes(k);
    if (!pending) expect(/పెద్దల|జ్యోతిష/.test(v), `te ${k}`).toBe(true);
  });
  it('the result screens carry the disclaimer copy', () => {
    expect(en['disclaimer.body']).toMatch(/does not promise/);
    expect(te['disclaimer.body']).toContain('హామీ ఇవ్వదు');
  });
});

describe('remedies are simple and free only (CLAUDE.md)', () => {
  const FORBIDDEN_REMEDY = [/\b(gem\w*|stone\w*|ring|rings|ruby|sapphire|emerald|pearl|coral|yantra|amulet)\b/i, /\b(buy|purchase|order|shop|price|paid|fee|book a)\b/i, /[₹$€£]/, /https?:\/\//];
  // Matched at the start of a word: సాయంత్రం (evening) must not trip యంత్రం (yantra).
  const FORBIDDEN_REMEDY_TE = ['రత్న', 'ఉంగరం', 'కొనండి', 'కొనుగోలు', 'ధర ', 'రుసుము', 'యంత్ర'].map((w) => new RegExp(`(^|[\\s,.(])${w}`));
  it.each(remedies.items.map((r) => [r.id, r] as const))('%s', (_id, r) => {
    expect(r.free).toBe(true);
    for (const re of FORBIDDEN_REMEDY) expect(r.en, `${re}`).not.toMatch(re);
    for (const re of FORBIDDEN_REMEDY_TE) expect(r.te, `${re}`).not.toMatch(re);
  });
});
