// Birth chart and Vimshottari dasha. Pure functions over the Ephemeris interface; rules from tables.
import type { Body, Ephemeris } from '../ephemeris/types';
import { BODIES } from '../ephemeris/types';
import nakshatras from '../tables/nakshatras.json';
import rasis from '../tables/rasis.json';
import vimshottari from '../tables/vimshottari.json';
import type { Name } from './panchangam';

const NAK = nakshatras.spanDegrees;
const PADA = NAK / 4;
const RASI = rasis.spanDegrees;

const pick = (te: string | null | undefined, en: string): Name => ({ en, te: te ?? null });

export const rasiOf = (lon: number) => Math.floor(lon / RASI) + 1;
export const nakshatraOf = (lon: number) => Math.floor(lon / NAK) + 1;
export const padaOf = (lon: number) => Math.floor((lon % NAK) / PADA) + 1;

export function rasiName(n: number): Name {
  const r = rasis.items[n - 1];
  if (!r) throw new RangeError(`rasi ${n}`);
  return pick(r.te, r.en);
}
export function nakshatraName(n: number): Name {
  const r = nakshatras.items[n - 1];
  if (!r) throw new RangeError(`nakshatra ${n}`);
  return pick(r.te, r.en);
}

export type Placement = {
  longitude: number;
  rasi: number;
  /** Degrees into the rasi, 0–30. */
  degree: number;
  nakshatra: number;
  pada: number;
  retrograde: boolean;
};

export function placement(longitude: number, speed: number): Placement {
  return { longitude, rasi: rasiOf(longitude), degree: longitude % RASI, nakshatra: nakshatraOf(longitude), pada: padaOf(longitude), retrograde: speed < 0 };
}

export type Lord = (typeof vimshottari.order)[number]['lord'];
export type DashaPeriod = { lord: Lord; start: number; end: number };
export type Mahadasha = DashaPeriod & { antardashas: DashaPeriod[] };

/** Nakshatra lord: the Vimshottari order repeats every 9 nakshatras from Ashwini (= Ketu). */
export function nakshatraLord(nakshatra: number): Lord {
  const row = vimshottari.order[(nakshatra - 1) % vimshottari.order.length];
  if (!row) throw new RangeError(`nakshatra ${nakshatra}`);
  return row.lord;
}

/**
 * Vimshottari mahadashas (with antardashas) covering one full 120-year cycle from the dasha running at birth.
 * The first mahadasha starts before birth by the elapsed share of the Moon's nakshatra.
 */
export function vimshottariDashas(moonLongitude: number, birthJd: number): { dashas: Mahadasha[]; balanceYears: number } {
  const order = vimshottari.order;
  const yearDays = vimshottari.yearDays;
  const nak = nakshatraOf(moonLongitude);
  const elapsed = (moonLongitude % NAK) / NAK; // 0–1 through the nakshatra
  const first = (nak - 1) % order.length;
  const firstYears = order[first]!.years;
  const balanceYears = (1 - elapsed) * firstYears;

  const dashas: Mahadasha[] = [];
  let start = birthJd - elapsed * firstYears * yearDays;
  for (let i = 0; i < order.length; i++) {
    const m = order[(first + i) % order.length]!;
    const end = start + m.years * yearDays;
    const antardashas: DashaPeriod[] = [];
    let a = start;
    for (let j = 0; j < order.length; j++) {
      const sub = order[(first + i + j) % order.length]!;
      const len = (m.years * sub.years) / vimshottari.totalYears * yearDays;
      antardashas.push({ lord: sub.lord, start: a, end: a + len });
      a += len;
    }
    dashas.push({ lord: m.lord, start, end, antardashas });
    start = end;
  }
  return { dashas, balanceYears };
}

export type ChartCore = {
  moon: Placement;
  planets: Record<Body, Placement>;
  /** Present only when the birth time is known. */
  lagna?: Placement;
};

/** Positions at an instant; `withLagna` false for time-unknown births (no lagna is ever computed). */
export function chartAt(e: Ephemeris, jdUt: number, at: { lat: number; lon: number }, withLagna: boolean): ChartCore {
  const pos = e.positions(jdUt);
  const planets = {} as Record<Body, Placement>;
  for (const b of BODIES) planets[b] = placement(pos[b].longitude, pos[b].speed);
  const core: ChartCore = { moon: planets.moon, planets };
  if (withLagna) core.lagna = placement(e.ascendant(jdUt, at), 1);
  return core;
}
