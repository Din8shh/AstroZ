// CLAUDE.md: rules are data. Every table carries source, version and notes; names come from tables.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = 'src/engine/tables';
const tables = Object.fromEntries(
  [...readdirSync(DIR).filter((f) => f.endsWith('.json')), ...readdirSync(`${DIR}/yearly`).filter((f) => f.endsWith('.json')).map((f) => `yearly/${f}`)]
    .map((f) => [f, JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Record<string, unknown>]),
);

type Named = { en: string; te: string | null };
const items = (f: string) => (tables[f] as { items: Named[] }).items;

describe('engine tables', () => {
  it.each(Object.keys(tables))('%s has source, version and notes', (f) => {
    const t = tables[f]!;
    for (const k of ['source', 'version', 'notes']) expect(String(t[k] ?? '').trim(), `${f}.${k}`).not.toBe('');
  });

  it('have the expected sizes', () => {
    expect(items('nakshatras.json')).toHaveLength(27);
    expect(items('tithis.json')).toHaveLength(30);
    expect(items('yogas.json')).toHaveLength(27);
    expect(items('masas.json')).toHaveLength(12);
    expect(items('samvatsaras.json')).toHaveLength(60);
    expect(items('varas.json')).toHaveLength(7);
  });

  it('day-period slots cover every weekday and stay in range', () => {
    const dp = tables['day-periods.json'] as {
      daytimeKalams: { parts: number; slots: Record<string, Record<string, number>> };
      durmuhurtham: { parts: number; daySlots: Record<string, number[]>; nightSlots: Record<string, number[]> };
      abhijit: { parts: number; slot: number };
    };
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    for (const [kind, slots] of Object.entries(dp.daytimeKalams.slots)) {
      expect(Object.keys(slots).sort(), kind).toEqual([...days].sort());
      for (const n of Object.values(slots)) expect(n).toBeGreaterThanOrEqual(1), expect(n).toBeLessThanOrEqual(dp.daytimeKalams.parts);
    }
    expect(Object.keys(dp.durmuhurtham.daySlots).sort()).toEqual([...days].sort());
    for (const n of [...Object.values(dp.durmuhurtham.daySlots), ...Object.values(dp.durmuhurtham.nightSlots)].flat()) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(dp.durmuhurtham.parts);
    }
    expect(dp.abhijit.slot).toBeLessThanOrEqual(dp.abhijit.parts);
  });

  // Telugu astrology names must be written by a person (CLAUDE.md). Gaps are listed, never filled by machine.
  const missing = ['tithis.json', 'nakshatras.json', 'yogas.json', 'masas.json', 'samvatsaras.json', 'varas.json', 'rasis.json']
    .flatMap((f) => items(f).filter((x) => !x.te).map((x) => `${f.replace('.json', '')}:${x.en}`));
  const k = tables['karanas.json'] as { movable: Named[]; fixed: Named[] };
  missing.push(...[...k.movable, ...k.fixed].filter((x) => !x.te).map((x) => `karanas:${x.en}`));
  const cal = tables['calendar.json'] as { ruthus: Named[]; ayana: { names: Record<string, Named> }; paksha: Record<string, Named> };
  missing.push(...cal.ruthus.filter((x) => !x.te).map((x) => `ruthus:${x.en}`));
  missing.push(...Object.values(cal.ayana.names).filter((x) => !x.te).map((x) => `ayana:${x.en}`));
  missing.push(...(Object.values(cal.paksha) as Named[]).filter((x) => !x.te).map((x) => `paksha:${x.en}`));
  missing.push(...(tables['tarabalam.json'] as { taras: Named[] }).taras.filter((x) => !x.te).map((x) => `taras:${x.en}`));
  if (missing.length) it.todo(`human-written Telugu needed for ${missing.length} names: ${missing.join(', ')}`);
});
