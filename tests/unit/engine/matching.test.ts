import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/matching-golden.json';
import { ashtakoota, kuja, matchCore, rajju, vedha, type MatchSide } from '../../../src/engine/rules/matching';
import kootas from '../../../src/engine/tables/kootas.json';
import doshas from '../../../src/engine/tables/doshas.json';
import guidance from '../../../src/engine/tables/match-guidance.json';
import remedies from '../../../src/content/remedies.json';
import te from '../../../src/content/te.json';
import en from '../../../src/content/en.json';
import { createEngine } from '../../../src/engine/core/engine';
import { loadEphemeris } from '../../../src/engine/ephemeris';

const NAK = 360 / 27;
/** A side with the Moon at the middle of a pada (no chart). */
const side = (nakshatra: number, pada: number, extra: Partial<MatchSide> = {}): MatchSide => {
  const lon = (nakshatra - 1) * NAK + (pada - 0.5) * (NAK / 4);
  return { nakshatra, rasi: Math.floor(lon / 30) + 1, moonDegree: lon % 30, ...extra };
};

describe('matching fixtures (tests/fixtures/matching-golden.json): koota points exact', () => {
  const open = fixture.rows.filter((r) => !r.expected).map((r) => r.id);
  if (open.length) it.todo(`fill from published reports (${open.length} rows): ${open.join(', ')}`);
  const published = fixture.rows.filter((r) => r.expected && !('illustrative' in r && r.illustrative));
  if (published.length < 10) it.todo(`SPEC §9 Phase 5 needs 10 published reports; ${published.length} filled (illustrative examples do not count)`);
  const unverified = fixture.rows.filter((r) => r.expected && !r.verified).map((r) => r.id);
  if (unverified.length) it.todo(`a person must check: ${unverified.join(', ')}`);

  for (const r of fixture.rows) {
    if (!r.expected) continue;
    const want = r.expected;
    it(`${r.id}: ${r.bride.note} × ${r.groom.note}`, () => {
      const ks = ashtakoota(side(r.bride.nakshatra, r.bride.pada), side(r.groom.nakshatra, r.groom.pada));
      const got = Object.fromEntries(ks.map((k) => [k.id, k.points]));
      const { total, ...perKoota } = want;
      expect(got).toEqual(perKoota);
      expect(ks.reduce((s, k) => s + k.points, 0)).toBe(total);
    });
  }
});

describe('koota tables', () => {
  it('maxima add up to 36', () => {
    expect(Object.values(kootas.kootas).reduce((s, k) => s + k.max, 0)).toBe(kootas.total);
  });
  it('every matrix cell is within 0..max and classifications cover every nakshatra / rasi', () => {
    for (const [id, k] of Object.entries(kootas.kootas)) {
      if ('matrix' in k) for (const row of k.matrix) for (const v of row) { expect(v, id).toBeGreaterThanOrEqual(0); expect(v, id).toBeLessThanOrEqual(k.max); }
      if ('byNakshatra' in k) expect(k.byNakshatra, id).toHaveLength(27);
      if ('byRasi' in k) expect(k.byRasi, id).toHaveLength(12);
    }
    expect(doshas.rajju.byNakshatra).toHaveLength(27);
  });
});

describe('rules', () => {
  it('tara: 1.5 per favourable direction; remainders 3, 5, 7 unfavourable', () => {
    const t = (b: number, g: number) => ashtakoota(side(b, 1), side(g, 1)).find((k) => k.id === 'tara')!.points;
    expect(t(4, 5)).toBe(3); // 2 and 9 (0): both favourable
    expect(t(1, 3)).toBe(1.5); // 3 → unfavourable; back 8 → favourable
    expect(t(1, 5)).toBe(1.5); // 5 / 6
    expect(t(1, 1)).toBe(3); // 1 / 1
  });

  it('bhakoot: 2/12, 5/9, 6/8 give 0', () => {
    const bh = (b: MatchSide, g: MatchSide) => ashtakoota(b, g).find((k) => k.id === 'bhakoot')!.points;
    expect(bh(side(1, 1), side(1, 2))).toBe(7); // same rasi
    expect(bh(side(1, 1), side(4, 1))).toBe(0); // Mesha → Vrishabha: 2/12
    expect(bh(side(1, 1), side(12, 1))).toBe(0); // Mesha → Simha: 5/9
    expect(bh(side(1, 1), side(13, 4))).toBe(0); // Mesha → Kanya: 6/8
    expect(bh(side(1, 1), side(8, 1))).toBe(7); // Mesha → Karkataka: 4/10
  });

  it('vashya splits Dhanus at 15°', () => {
    const g = (s: MatchSide) => ashtakoota(s, side(3, 2)).find((k) => k.id === 'vashya')!.reasons[0]!.values.bride;
    expect(g({ nakshatra: 19, rasi: 9, moonDegree: 5 })).toBe('nara');
    expect(g({ nakshatra: 20, rasi: 9, moonDegree: 20 })).toBe('chatushpada');
  });

  it('nadi: same nadi gives 0', () => {
    expect(ashtakoota(side(1, 1), side(6, 1)).find((k) => k.id === 'nadi')!.points).toBe(0); // Ashwini, Ardra: Adi
  });

  it('rajju and vedha', () => {
    expect(rajju(side(4, 1), side(13, 1)).present).toBe(true); // Rohini, Hasta: both Kantha (reference.md §1)
    expect(rajju(side(4, 1), side(5, 1)).present).toBe(false);
    expect(vedha(side(1, 1), side(18, 1)).present).toBe(true); // Ashwini–Jyeshtha
    expect(vedha(side(4, 1), side(13, 1)).present).toBe(false);
  });

  it('kuja: from lagna and Moon; both present balances; no chart → not checked', () => {
    const base = side(4, 1); // Moon in Vrishabha (2)
    const withMars = (marsRasi: number, lagnaRasi?: number): MatchSide => ({ ...base, mars: { rasi: marsRasi }, ...(lagnaRasi && { lagnaRasi }) });
    const clear = withMars(5, 1); // Mars 4th from Moon? Vrishabha→Simha = 4 → present
    expect(kuja(withMars(3), withMars(3)).checked).toBe(true);
    const k1 = kuja(withMars(4), withMars(4)); // 3rd from Moon: clear for both
    expect(k1.checked && k1.status).toBe('good');
    const k2 = kuja(clear, withMars(4));
    expect(k2.checked && k2.bride.present).toBe(true);
    expect(k2.checked && k2.status).toBe('mixed');
    const k3 = kuja(clear, clear);
    expect(k3.checked && k3.status).toBe('good'); // both: balanced
    expect(k3.reasons[0]!.ruleId).toBe('dosha.kuja.balanced');
    expect(kuja(base, base).checked).toBe(false);
    // Without a lagna (time unknown) only the Moon is used.
    const k4 = kuja(withMars(8), withMars(4));
    expect(k4.checked && k4.fromLagna).toBe(false);
  });

  it('kuja: lagna is used only when both partners have one; the trigger names the reference point', () => {
    const base = side(4, 1); // Moon in Vrishabha (2)
    // Mars in Mesha (1): 12th from the Moon (dosha). From a Mithuna lagna (3) it is the 11th (clear).
    const lagnaClear: MatchSide = { ...base, mars: { rasi: 1 }, lagnaRasi: 3 };
    const lagnaHit: MatchSide = { ...base, mars: { rasi: 4 }, lagnaRasi: 3 }; // Karkataka: 2nd from Mithuna lagna, 3rd from Moon
    const noTime: MatchSide = { ...base, mars: { rasi: 4 } };
    const both = kuja(lagnaHit, { ...base, mars: { rasi: 4 }, lagnaRasi: 9 });
    expect(both.checked && both.fromLagna).toBe(true);
    expect(both.checked && both.bride.trigger).toEqual({ from: 'lagna', house: 2 });
    // One partner has no birth time → both judged from the Moon only, so the lagna hit is not used.
    const mixed = kuja(lagnaHit, noTime);
    expect(mixed.checked && mixed.fromLagna).toBe(false);
    expect(mixed.checked && mixed.bride.present).toBe(false);
    expect(mixed.checked && mixed.bride.fromLagna).toBeUndefined();
    const moonHit = kuja(lagnaClear, noTime);
    expect(moonHit.checked && moonHit.bride.trigger).toEqual({ from: 'moon', house: 12 });
  });

  it('vashya: a names-basis pada that straddles the 15° split is flagged uncertain', () => {
    const at = (nakshatra: number, rasi: number, lo: number, hi: number): MatchSide => ({ nakshatra, rasi, moonDegree: (lo + hi) / 2, moonDegreeRange: [lo, hi] });
    // Purva Ashadha pada 1: 253°20′–256°40′ = Dhanus 13.33°–16.67°.
    const k = ashtakoota(at(20, 9, 40 / 3, 50 / 3), side(4, 1)).find((x) => x.id === 'vashya')!;
    expect(k.reasons[0]!.values.uncertain).toBe(true);
    const k2 = ashtakoota(at(19, 9, 0, 10 / 3), side(4, 1)).find((x) => x.id === 'vashya')!;
    expect(k2.reasons[0]!.values.uncertain).toBe(false);
  });

  it('total and band', () => {
    const m = matchCore(side(4, 1), side(5, 1));
    expect(m.score).toBe(35);
    expect(m.status).toBe('good');
  });
});

describe('guidance ids exist in content; remedies are free', () => {
  it('every to-do id has te and en copy', () => {
    const ids = [...new Set(Object.values(guidance.todos).flat())];
    for (const id of ids) {
      expect((te as Record<string, unknown>)[`${id}.text`], `te ${id}`).toBeTruthy();
      expect((en as Record<string, unknown>)[`${id}.text`], `en ${id}`).toBeTruthy();
    }
  });
  it('every remedy id is in remedies.json with free: true (CLAUDE.md)', () => {
    const all = remedies.items as { id: string; free: boolean }[];
    for (const id of Object.values(guidance.remedies).flat()) expect(all.find((r) => r.id === id), id).toBeTruthy();
    for (const r of all) expect(r.free, r.id).toBe(true);
  });
});

describe('engine.match', () => {
  const engine = createEngine(() => loadEphemeris());
  const place = { lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' };

  it('chart basis uses the Moon of each chart; time unknown checks kuja from the Moon only', async () => {
    const m = await engine.match({
      basis: 'chart',
      bride: { name: 'Sravani', birth: { date: '1995-08-14', time: '05:40', timeKnown: true, place } },
      groom: { name: 'Kiran', birth: { date: '1993-02-10', timeKnown: false, place } },
    });
    expect(m.basis).toBe('chart');
    expect(m.approximate).toBe(true); // the groom's time is unknown
    expect(m.kootas).toHaveLength(8);
    expect(m.kuja.checked && m.kuja.fromLagna).toBe(false);
    expect(m.score).toBe(m.kootas.reduce((s, k) => s + k.points, 0));
    expect(m.peruBalam).toBeDefined();
    expect(m.groom.approximate).toBe(true);
    expect(m.groom.dayRange).toBeDefined(); // time unknown → the day's Moon range is passed to the UI
    expect(m.bride.dayRange).toBeUndefined();
  });

  it('names basis: Purva Ashadha 1 and Shravana 2 carry an uncertain vashya flag', async () => {
    // Bhuvan → Purva Ashadha 1, Khushi → Shravana 2: both padas straddle 15° of a split rasi.
    const m = await engine.match({ basis: 'names', bride: { name: 'Bhuvan' }, groom: { name: 'Khushi' } });
    expect([m.bride.nakshatra, m.bride.pada, m.groom.nakshatra, m.groom.pada]).toEqual([20, 1, 22, 2]);
    expect(m.kootas.find((k) => k.id === 'vashya')!.reasons[0]!.values.uncertain).toBe(true);
    const clear = await engine.match({ basis: 'names', bride: { name: 'అనూష' }, groom: { name: 'సాయి' } });
    expect(clear.kootas.find((k) => k.id === 'vashya')!.reasons[0]!.values.uncertain).toBe(false);
  });

  it('chart basis flags an ambiguous name for peru balam', async () => {
    const m = await engine.match({
      basis: 'chart',
      bride: { name: 'Bunny', birth: { date: '1995-08-14', time: '05:40', timeKnown: true, place } },
      groom: { name: 'Kiran', birth: { date: '1993-02-10', time: '10:00', timeKnown: true, place } },
    });
    expect(m.peruBalam?.ambiguous).toBe(true);
    expect(m.approximate).toBe(false);
  });

  it('names basis is approximate and never checks kuja', async () => {
    const m = await engine.match({ basis: 'names', bride: { name: 'అనూష' }, groom: { name: 'సాయి' } });
    expect(m.approximate).toBe(true);
    expect(m.kuja.checked).toBe(false);
    expect(m.bride.aksharam).toBe('అ');
    expect(m.todos.map((t) => t.id)).toEqual(guidance.todos.names);
  });
});
