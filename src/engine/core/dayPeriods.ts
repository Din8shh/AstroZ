// Day periods (Rahu kalam, Yamagandam, Gulika, Durmuhurtham, Abhijit, Varjyam, Amrita kalam).
// Every slot number, part count and ghati value comes from src/engine/tables; nothing is hardcoded here.
import table from '../tables/day-periods.json';
import nakshatras from '../tables/nakshatras.json';
import type { NakshatraSpan, Name } from './panchangam';

export type PeriodKind = keyof typeof table.kinds;
export type PeriodStatus = 'good' | 'avoid';

export type DayPeriod = {
  kind: PeriodKind;
  name: Name;
  status: PeriodStatus;
  start: number; // JD UT
  end: number; // JD UT
  /** false when the table rule for this weekday/nakshatra is not yet confirmed against the reference. */
  verified: boolean;
};

type VaraId = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type DayFrame = { sunrise: number; sunset: number; nextSunrise: number; vara: VaraId };

function make(kind: PeriodKind, start: number, end: number, verified: boolean): DayPeriod {
  const k = table.kinds[kind];
  return { kind, name: { en: k.en, te: k.te }, status: k.status as PeriodStatus, start, end, verified };
}

/** Slot n (1-based) of `parts` equal parts of [from, to]. */
const slot = (from: number, to: number, parts: number, n: number): [number, number] => {
  const len = (to - from) / parts;
  return [from + (n - 1) * len, from + n * len];
};

export function dayPeriods(day: DayFrame, nakshatraSpans: NakshatraSpan[]): DayPeriod[] {
  const { sunrise, sunset, nextSunrise, vara } = day;
  const out: DayPeriod[] = [];

  const kalams = table.daytimeKalams;
  const kalamVerified = kalams.verified.includes(vara);
  for (const kind of ['rahu', 'yamagandam', 'gulika'] as const) {
    const n = kalams.slots[kind][vara];
    out.push(make(kind, ...slot(sunrise, sunset, kalams.parts, n), kalamVerified));
  }

  const dm = table.durmuhurtham;
  const dmVerified = dm.verified.includes(vara);
  for (const n of dm.daySlots[vara] ?? []) out.push(make('durmuhurtham', ...slot(sunrise, sunset, dm.parts, n), dmVerified));
  const night = (dm.nightSlots as Partial<Record<VaraId, number[]>>)[vara] ?? [];
  for (const n of night) out.push(make('durmuhurtham', ...slot(sunset, nextSunrise, dm.parts, n), dmVerified));

  const ab = table.abhijit;
  if (!ab.skipVaras.includes(vara)) out.push(make('abhijit', ...slot(sunrise, sunset, ab.parts, ab.slot), ab.verified.includes(vara)));

  // Varjyam and Amrita kalam: ghati/60 into each nakshatra, lasting lengthGhatis/60 of it.
  const w = table.nakshatraWindows;
  for (const s of nakshatraSpans) {
    const row = nakshatras.items[s.number - 1];
    if (!row) continue;
    const dur = s.end - s.start;
    const windows: [PeriodKind, number, boolean][] = [
      ['varjyam', row.varjyamGhati, row.varjyamVerified],
      ['amrita', row.amritaGhati, row.amritaVerified],
    ];
    for (const [kind, ghati, verified] of windows) {
      const start = s.start + (ghati / w.ghatisPerNakshatra) * dur;
      const end = start + (w.lengthGhatis / w.ghatisPerNakshatra) * dur;
      if (end > sunrise && start < nextSunrise) out.push(make(kind, start, end, verified));
    }
  }

  return out.sort((a, b) => a.start - b.start);
}
