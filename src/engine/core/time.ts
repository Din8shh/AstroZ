// Time handling: local civil time (IANA zone, with historical offsets) ↔ Julian Day UT.
// Pure functions; no ephemeris. Luxon reads the zone rules from the runtime's tzdb (Intl),
// so historical offsets come for free, e.g. Asia/Kolkata was +05:21:10 (Madras time) in 1900
// and +06:30 (war time) from 1942-09 to 1945-10.
import { DateTime } from 'luxon';

/** Julian Day of the Unix epoch, 1970-01-01T00:00Z. */
const JD_UNIX_EPOCH = 2440587.5;
const MS_PER_DAY = 86_400_000;

export type LocalMoment = {
  /** Civil date, YYYY-MM-DD (Gregorian). */
  date: string;
  /** Civil time, HH:mm or HH:mm:ss. Defaults to 00:00. */
  time?: string;
  /** IANA zone, e.g. "Asia/Kolkata", "America/Chicago". */
  tz: string;
};

/**
 * - 'ok': the wall time exists exactly once.
 * - 'gap': the wall time does not exist (clocks jumped forward); moved forward by the jump.
 * - 'ambiguous': the wall time happened twice (clocks went back); the FIRST occurrence is used.
 *   Callers that take birth times should ask the user when they see 'gap' or 'ambiguous'.
 */
export type TimeNote = 'ok' | 'gap' | 'ambiguous';

export type ResolvedMoment = {
  jdUt: number;
  /** UTC instant, ISO 8601. */
  utc: string;
  /** Offset from UTC in minutes at that instant (may be fractional for historical LMT). */
  offsetMinutes: number;
  note: TimeNote;
};

export class TimeInputError extends Error {
  override name = 'TimeInputError';
}

export const jdFromUnixMs = (ms: number): number => ms / MS_PER_DAY + JD_UNIX_EPOCH;
export const unixMsFromJd = (jd: number): number => (jd - JD_UNIX_EPOCH) * MS_PER_DAY;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/;

function parseParts(m: LocalMoment) {
  const d = DATE_RE.exec(m.date);
  if (!d) throw new TimeInputError(`date must be YYYY-MM-DD`);
  const t = TIME_RE.exec(m.time ?? '00:00');
  if (!t) throw new TimeInputError(`time must be HH:mm or HH:mm:ss`);
  const sec = Number(t[3] ?? 0);
  return {
    year: Number(d[1]), month: Number(d[2]), day: Number(d[3]),
    hour: Number(t[1]), minute: Number(t[2]), second: Math.floor(sec),
    millisecond: Math.round((sec % 1) * 1000),
  };
}

/** Local civil time in a zone → Julian Day UT, using the zone's offset in force at that moment. */
export function resolveLocal(m: LocalMoment): ResolvedMoment {
  const parts = parseParts(m);
  const probe = DateTime.fromObject(parts, { zone: m.tz });
  if (!probe.isValid) {
    throw new TimeInputError(probe.invalidExplanation ?? probe.invalidReason ?? 'invalid date, time or zone');
  }

  let dt = probe;
  let note: TimeNote = 'ok';
  const sameWall = probe.year === parts.year && probe.month === parts.month && probe.day === parts.day &&
    probe.hour === parts.hour && probe.minute === parts.minute && probe.second === parts.second;
  if (!sameWall) {
    // Luxon only moves a wall time when it falls in a DST gap — but an out-of-range field
    // (e.g. 31 Feb) would also move it, and must be rejected instead.
    const naive = DateTime.fromObject(parts, { zone: 'UTC' });
    if (!naive.isValid || naive.day !== parts.day || naive.hour !== parts.hour) {
      throw new TimeInputError('that date or time does not exist');
    }
    note = 'gap';
  } else {
    const possible = probe.getPossibleOffsets();
    if (possible.length > 1) {
      note = 'ambiguous';
      dt = possible.reduce((a, b) => (a.toMillis() <= b.toMillis() ? a : b)); // first occurrence
    }
  }

  return { jdUt: jdFromUnixMs(dt.toMillis()), utc: dt.toUTC().toISO() ?? '', offsetMinutes: dt.offset, note };
}

export type LocalTime = {
  jdUt: number;
  /** Local civil date, YYYY-MM-DD. */
  date: string;
  /** Local civil time, HH:mm:ss (truncated to the second). */
  time: string;
  offsetMinutes: number;
};

/** Julian Day UT → local civil time in a zone. */
export function toLocal(jdUt: number, tz: string): LocalTime {
  // A JD near 2.46e6 only resolves ~40 µs, so round to the millisecond before truncating
  // to seconds; otherwise 06:24:05 can come back as 06:24:04.9999 → "06:24:04".
  const dt = DateTime.fromMillis(Math.round(unixMsFromJd(jdUt)), { zone: tz });
  if (!dt.isValid) throw new TimeInputError(`unknown time zone: ${tz}`);
  return { jdUt, date: dt.toFormat('yyyy-MM-dd'), time: dt.toFormat('HH:mm:ss'), offsetMinutes: dt.offset };
}

/** Julian Day UT of the start of a civil day (local midnight, or the first instant after a midnight DST gap). */
export function startOfLocalDay(date: string, tz: string): number {
  const d = DATE_RE.exec(date);
  if (!d) throw new TimeInputError('date must be YYYY-MM-DD');
  const dt = DateTime.fromObject({ year: Number(d[1]), month: Number(d[2]), day: Number(d[3]) }, { zone: tz }).startOf('day');
  if (!dt.isValid) throw new TimeInputError(dt.invalidExplanation ?? 'invalid date or zone');
  return jdFromUnixMs(dt.toMillis());
}

/** Seconds between two Julian Days (b − a). */
export const secondsBetween = (a: number, b: number): number => (b - a) * 86_400;
