// Draft Telugu names loaded before a human review (src/engine/tables/te-unreviewed.json). CLAUDE.md: Telugu is written by a human.
// This keeps the list honest: every entry must still match its table, and what remains shows up as a todo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import reg from '../../src/engine/tables/te-unreviewed.json';

const at = (table: string, path: string): { en: string; te: string | null } => {
  let o: unknown = JSON.parse(readFileSync(`src/engine/tables/${table}`, 'utf8'));
  for (const part of path.match(/[^.[\]]+|\[\d+\]/g)!) o = (o as Record<string, unknown>)[part.startsWith('[') ? Number(part.slice(1, -1)) : part];
  return o as { en: string; te: string | null };
};

describe('unreviewed draft Telugu names (te-unreviewed.json)', () => {
  if (reg.entries.length) it.todo(`a fluent Telugu speaker must review ${reg.entries.length} draft names (${reg.entries.filter((e) => 'flag' in e).length} flagged), then remove them from te-unreviewed.json`);
  it('every entry still matches its table (remove the entry once reviewed or changed)', () => {
    for (const e of reg.entries) {
      const o = at(e.table, e.path);
      expect(o.en, `${e.table} ${e.path}`).toBe(e.en);
      expect(o.te, `${e.table} ${e.path}: te changed — reviewed? then remove the entry`).toBe(e.te);
    }
  });
});
