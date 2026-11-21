import { describe, expect, it } from 'vitest';
import te from '../../src/content/te.json';
import en from '../../src/content/en.json';
import { parseHash } from '../../src/app/router';

describe('content catalogs', () => {
  it('te and en have exactly the same keys', () => {
    expect(Object.keys(te).sort()).toEqual(Object.keys(en).sort());
  });

  it('every string is non-empty', () => {
    for (const [k, v] of [...Object.entries(te), ...Object.entries(en)]) {
      expect(v.trim(), k).not.toBe('');
    }
  });

  it('Telugu strings are not left in English (except brand-neutral keys)', () => {
    const latinOnly = new Set(['lang.en', '$source']);
    for (const [k, v] of Object.entries(te)) {
      if (latinOnly.has(k)) continue;
      expect(/[ఀ-౿]/.test(v), `te.${k} has no Telugu script`).toBe(true);
    }
  });
});

describe('hash router', () => {
  it.each([
    ['', 'today'],
    ['#/', 'today'],
    ['#/wishes', 'wishes'],
    ['#/family/abc', 'family'],
    ['#/more?x=1', 'more'],
    ['#/unknown', 'today'],
  ])('%s → %s', (hash, tab) => {
    expect(parseHash(hash)).toBe(tab);
  });
});
