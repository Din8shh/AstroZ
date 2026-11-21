// Tarabalam and chandrabalam (telugu-jyotisha skill; tables: tarabalam.json, chandrabalam.json).
// Rules return structured readings: status + reasons with rule ids and values, never prose.
import tarabalamTable from '../tables/tarabalam.json';
import chandrabalamTable from '../tables/chandrabalam.json';
import type { Name } from '../core/panchangam';

export type Status = 'good' | 'mixed' | 'avoid';
export type Reason = { ruleId: string; values: Record<string, unknown> };
export type Reading = { status: Status; score?: number; reasons: Reason[]; todos: { id: string }[]; remedies: string[] };

export function tarabalam(birthNakshatra: number, dayNakshatra: number): Reading & { tara: { number: number; name: Name } } {
  const count = ((dayNakshatra - birthNakshatra + 27) % 27) + 1;
  const tara = ((count - 1) % 9) + 1;
  const row = tarabalamTable.taras.find((t) => t.tara === tara);
  if (!row) throw new RangeError(`tara ${tara}`);
  return {
    status: row.status as Status,
    reasons: [{ ruleId: 'tarabalam.count', values: { birthNakshatra, dayNakshatra, count, tara } }],
    todos: [],
    remedies: [],
    tara: { number: tara, name: { en: row.en, te: row.te ?? null } },
  };
}

export function chandrabalam(birthRasi: number, dayMoonRasi: number): Reading & { house: number } {
  const house = ((dayMoonRasi - birthRasi + 12) % 12) + 1;
  const good = chandrabalamTable.goodHouses.includes(house);
  return {
    status: good ? 'good' : 'avoid',
    reasons: [{ ruleId: 'chandrabalam.house', values: { birthRasi, dayMoonRasi, house } }],
    todos: [],
    remedies: [],
    house,
  };
}
