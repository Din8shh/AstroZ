import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/names-golden.json';
import { namaNakshatra } from '../../../src/engine/core/nama';
import table from '../../../src/engine/tables/nama-syllables.json';

describe('name fixtures (tests/fixtures/names-golden.json)', () => {
  it('has at least 30 rows, Telugu and Latin', () => {
    expect(fixture.rows.length).toBeGreaterThanOrEqual(30);
    expect(fixture.rows.some((r) => /[ఀ-౿]/.test(r.input))).toBe(true);
    expect(fixture.rows.some((r) => /^[A-Za-z ]+$/.test(r.input))).toBe(true);
  });

  for (const r of fixture.rows) {
    it(`${r.input} → ${r.expected.join(', ')}`, () => {
      const got = namaNakshatra(r.input);
      expect(got, 'no result').not.toBeNull();
      expect(got!.candidates.map((c) => `${c.nakshatra}-${c.pada}`), r.why).toEqual(r.expected);
    });
  }
});

describe('nama nakshatra', () => {
  it('the table has one or more syllables for all 108 padas', () => {
    const padas = new Set(table.items.map((x) => `${x.nakshatra}-${x.pada}`));
    expect(padas.size).toBe(108);
  });

  it('returns the aksharam it used', () => {
    expect(namaNakshatra('శ్రావణి')!.aksharam).toBe('శ్రా');
    expect(namaNakshatra('క్షితిజ్')!.aksharam).toBe('క్షి');
    expect(namaNakshatra('Kiran')!.aksharam).toBe('ki');
  });

  it('marks fallback matches as near', () => {
    expect(namaNakshatra('బాలు')!.candidates.every((c) => c.match === 'near')).toBe(true);
    expect(namaNakshatra('Kiran')!.candidates.every((c) => c.match === 'exact')).toBe(true);
  });

  it.each(['', '   ', '123', '!!!'])('no result for %j', (input) => {
    expect(namaNakshatra(input)).toBeNull();
  });
});
