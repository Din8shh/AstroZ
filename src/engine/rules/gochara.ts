// Gochara (transits) from the janma (Moon) rasi — tables/gochara.json (reference.md §10).
// Calm by design: houses are 'good' or 'mixed', never 'avoid'; Saturn's named phases are reasons, not predictions.
import table from '../tables/gochara.json';
import type { Reason, Status } from './strength';

export type TransitPlanet = 'jupiter' | 'saturn' | 'rahu';
export const TRANSIT_PLANETS = table.order as TransitPlanet[];
export type TransitPhase = 'sadeSati' | 'ardhashtama' | 'ashtama';

export const houseFrom = (janmaRasi: number, transitRasi: number) => ((transitRasi - janmaRasi + 12) % 12) + 1;

export function transit(planet: TransitPlanet, janmaRasi: number, transitRasi: number): { house: number; status: Status; phase?: TransitPhase; reasons: Reason[] } {
  const p = table.planets[planet];
  const house = houseFrom(janmaRasi, transitRasi);
  const status: Status = p.good.includes(house) ? 'good' : 'mixed';
  const phase = (Object.entries(p.phases) as [TransitPhase, number[]][]).find(([, hs]) => hs.includes(house))?.[0];
  return { house, status, ...(phase && { phase }), reasons: [{ ruleId: `gochara.${planet}`, values: { house, transitRasi, janmaRasi, status, ...(phase && { phase }) } }] };
}
