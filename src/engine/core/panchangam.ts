// Panchangam: the five angas with start/end times, plus vara, masa, paksha, samvatsara, ayana, ruthu.
// Pure functions over the Ephemeris interface. Every name and rule constant comes from src/engine/tables.
import type { Ephemeris } from '../ephemeris/types';
import tithis from '../tables/tithis.json';
import nakshatras from '../tables/nakshatras.json';
import yogas from '../tables/yogas.json';
import karanas from '../tables/karanas.json';
import masas from '../tables/masas.json';
import samvatsaras from '../tables/samvatsaras.json';
import varas from '../tables/varas.json';
import calendar from '../tables/calendar.json';

export type Name = { en: string; te: string | null };

/** An anga (tithi, nakshatra…) current at some point of the day, with its own start and end. */
export type AngaSpan = { number: number; name: Name; start: number; end: number };

const SECOND = 1 / 86_400;
const HOUR = 1 / 24;
const SYNODIC_MONTH = 29.530588;

const norm360 = (d: number) => ((d % 360) + 360) % 360;
/** Signed difference a − b folded into (−180, 180]. */
const wrap180 = (d: number) => {
  const x = norm360(d);
  return x > 180 ? x - 360 : x;
};

type AngleFn = (jdUt: number) => number;

export const angles = (e: Ephemeris) => {
  const sun = (jd: number) => e.position('sun', jd).longitude;
  const moon = (jd: number) => e.position('moon', jd).longitude;
  return {
    sun,
    moon,
    /** Moon − Sun, the tithi and karana angle. Always increasing. */
    elongation: (jd: number) => norm360(moon(jd) - sun(jd)),
    /** Sun + Moon, the yoga angle. Always increasing. */
    yogaSum: (jd: number) => norm360(sun(jd) + moon(jd)),
  };
};

/**
 * The instant the (increasing) angle f reaches `target` (mod 360), searching forward from `from`
 * (direction +1) or backward (−1). Steps an hour at a time, then bisects to 1 second.
 * Precondition: the crossing is within `maxDays` and f advances < 180° per step.
 */
export function findCrossing(f: AngleFn, target: number, from: number, direction: 1 | -1, maxDays = 32, step = HOUR): number {
  const g = (t: number) => wrap180(f(t) - target);
  let a = from;
  let ga = g(a);
  // Forward: looking for g going − → +. Backward: looking for g at a ≥ 0 and earlier < 0.
  for (let n = 0; n * step <= maxDays; n++) {
    const b = a + direction * step;
    const gb = g(b);
    const crossed = direction === 1 ? ga < 0 && gb >= 0 : ga >= 0 && gb < 0;
    if (crossed) {
      let lo = Math.min(a, b);
      let hi = Math.max(a, b);
      while (hi - lo > SECOND) {
        const mid = (lo + hi) / 2;
        if (g(mid) < 0) lo = mid;
        else hi = mid;
      }
      return hi; // first instant with g ≥ 0, to within 1 s
    }
    a = b;
    ga = gb;
  }
  throw new Error(`no crossing of ${target}° within ${maxDays} days`);
}

/** All angas of size `span` degrees current at any moment in [from, to). */
export function angaSpans(f: AngleFn, span: number, count: number, from: number, to: number, name: (n: number) => Name): AngaSpan[] {
  const out: AngaSpan[] = [];
  let idx = Math.floor(f(from) / span); // 0-based
  let start = findCrossing(f, idx * span, from + SECOND, -1);
  while (start < to) {
    // Search from the anga's own start (not from `from`): if the boundary lies within a second
    // after `from`, starting the search at `from` would step past it and find the NEXT cycle.
    const end = findCrossing(f, ((idx + 1) % count) * span, start + SECOND, 1);
    if (end > from) out.push({ number: idx + 1, name: name(idx + 1), start, end });
    start = end;
    idx = (idx + 1) % count;
  }
  return out;
}

const pick = (te: string | null | undefined, en: string): Name => ({ en, te: te ?? null });

export const names = {
  tithi: (n: number): Name => {
    const t = tithis.items[n - 1];
    if (!t) throw new RangeError(`tithi ${n}`);
    return pick(t.te, t.en);
  },
  nakshatra: (n: number): Name => {
    const t = nakshatras.items[n - 1];
    if (!t) throw new RangeError(`nakshatra ${n}`);
    return pick(t.te, t.en);
  },
  yoga: (n: number): Name => {
    const t = yogas.items[n - 1];
    if (!t) throw new RangeError(`yoga ${n}`);
    return pick(t.te, t.en);
  },
  karana: (k: number): Name => {
    const fixed = karanas.fixed.find((x) => x.k === k);
    if (fixed) return pick(fixed.te, fixed.en);
    const m = karanas.movable[(k - 2) % karanas.movable.length];
    if (!m || k < 2 || k > 57) throw new RangeError(`karana ${k}`);
    return pick(m.te, m.en);
  },
};

export type NakshatraSpan = AngaSpan & { padas: { pada: number; end: number }[] };

export function fiveAngas(e: Ephemeris, from: number, to: number) {
  const a = angles(e);
  const nakSpan = nakshatras.spanDegrees;
  const padaSpan = nakSpan / 4;
  const nakshatra: NakshatraSpan[] = angaSpans(a.moon, nakSpan, 27, from, to, names.nakshatra).map((s) => {
    // Pada boundaries inside this nakshatra that fall after `from`.
    const padas: { pada: number; end: number }[] = [];
    for (let p = 1; p <= 4; p++) {
      const end = p === 4 ? s.end : findCrossing(a.moon, (s.number - 1) * nakSpan + p * padaSpan, s.start + SECOND, 1);
      if (end > from) padas.push({ pada: p, end });
    }
    return { ...s, padas };
  });
  return {
    tithi: angaSpans(a.elongation, tithis.spanDegrees, 30, from, to, names.tithi),
    nakshatra,
    yoga: angaSpans(a.yogaSum, yogas.spanDegrees, 27, from, to, names.yoga),
    karana: angaSpans(a.elongation, karanas.spanDegrees, 60, from, to, names.karana),
  };
}

export type Masa = { number: number; name: Name; adhika: boolean; kshaya: boolean; ruthu: number; startNewMoon: number; endNewMoon: number };

const rasiOf = (lon: number) => Math.floor(norm360(lon) / 30) + 1;

/** Amanta month containing jdUt (masas.json rule). */
export function amantaMasa(e: Ephemeris, jdUt: number): Masa {
  const a = angles(e);
  // The elongation moves ≤ 15.5°/day, so 6-hour steps cannot skip the new moon.
  const startNewMoon = findCrossing(a.elongation, 0, jdUt, -1, 35, 6 * HOUR);
  const endNewMoon = findCrossing(a.elongation, 0, startNewMoon + SECOND, 1, 35, 6 * HOUR);
  const r0 = rasiOf(a.sun(startNewMoon));
  const r1 = rasiOf(a.sun(endNewMoon));
  const sankrantis = (r1 - r0 + 12) % 12;
  const number = (r0 % 12) + 1;
  const m = masas.items[number - 1];
  if (!m) throw new RangeError(`masa ${number}`);
  return { number, name: pick(m.te, m.en), adhika: sankrantis === 0, kshaya: sankrantis >= 2, ruthu: m.ruthu, startNewMoon, endNewMoon };
}

export type Samvatsara = { number: number; name: Name; shaka: number };

/** The 60-year samvatsara for a date in a given amanta masa (samvatsaras.json rule). */
export function samvatsara(masa: Masa): Samvatsara {
  // The Chaitra that began this lunar year started about (masa − 1) months before this masa did.
  const chaitraStart = masa.startNewMoon - (masa.number - 1) * SYNODIC_MONTH;
  const year = new Date((chaitraStart - 2440587.5) * 86_400_000).getUTCFullYear();
  const shaka = year - 78;
  const number = (((shaka - samvatsaras.epochShaka) % 60) + 60) % 60 + 1;
  const s = samvatsaras.items[number - 1];
  if (!s) throw new RangeError(`samvatsara ${number}`);
  return { number, name: pick(s.te, s.en), shaka };
}

export type Vara = { number: number; id: string; name: Name };

/** Vara from the ISO weekday of the civil date of sunrise (1 = Monday … 7 = Sunday). */
export function vara(isoWeekday: number): Vara {
  const number = (isoWeekday % 7) + 1; // Sunday → 1
  const v = varas.items[number - 1];
  if (!v) throw new RangeError(`weekday ${isoWeekday}`);
  return { number, id: v.id, name: pick(v.te, v.en) };
}

export type Ayana = { id: 'uttarayana' | 'dakshinayana'; name: Name };

export function ayana(sunLongitude: number): Ayana {
  const id = calendar.ayana.uttarayanaRasis.includes(rasiOf(sunLongitude)) ? 'uttarayana' : 'dakshinayana';
  const n = calendar.ayana.names[id];
  return { id, name: pick(n.te, n.en) };
}

export function paksha(tithiNumber: number): { id: 'shukla' | 'krishna'; name: Name } {
  const id = tithiNumber <= 15 ? 'shukla' : 'krishna';
  const n = calendar.paksha[id];
  return { id, name: pick(n.te, n.en) };
}

export function ruthu(number: number): { number: number; name: Name } {
  const r = calendar.ruthus.find((x) => x.number === number);
  if (!r) throw new RangeError(`ruthu ${number}`);
  return { number, name: pick(r.te, r.en) };
}

export { rasiOf };
