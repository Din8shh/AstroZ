import { describe, expect, it } from 'vitest';
import te from '../../src/content/te.json';
import en from '../../src/content/en.json';
import { parseHash } from '../../src/app/router';

describe('content catalogs', () => {
  const pending = new Set<string>((te as { $pending?: string[] }).$pending ?? []);
  const teKeys = Object.keys(te).filter((k) => k !== '$pending');

  it('te and en have exactly the same keys', () => {
    expect(teKeys.sort()).toEqual(Object.keys(en).sort());
  });

  it('every string is non-empty', () => {
    for (const [k, v] of [...Object.entries(te), ...Object.entries(en)]) {
      if (k === '$pending') continue;
      expect(String(v).trim(), k).not.toBe('');
    }
  });

  it('Telugu strings are not left in English (except brand-neutral keys)', () => {
    const latinOnly = new Set(['lang.en', '$source', '$pending', 'why.title', 'future.span', 'future.d.range']); // why.title is a pure template: {koota} · {points}/{max}
    for (const [k, v] of Object.entries(te)) {
      if (latinOnly.has(k) || pending.has(k)) continue;
      expect(/[ఀ-౿]/.test(String(v)), `te.${k} has no Telugu script`).toBe(true);
    }
  });

  if (pending.size) it.todo(`human-written Telugu needed for content keys: ${[...pending].join(', ')}`);
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
