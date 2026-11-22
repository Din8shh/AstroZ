// Display formatting for civil dates and clock times. Uses Intl (CLDR locale data), not astrology tables.
import type { Lang } from './types';

const LOCALE: Record<Lang, string> = { te: 'te-IN', en: 'en-GB' };

/** Today's civil date (YYYY-MM-DD) in a time zone. */
export function todayIn(tz: string, now = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** HH:MM (24 h) of an instant in a time zone. */
export function clockIn(tz: string, now = Date.now()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

const parts = (date: string, lang: Lang, opts: Intl.DateTimeFormatOptions) => {
  const [y, m, d] = date.split('-').map(Number);
  const f = new Intl.DateTimeFormat(LOCALE[lang], { ...opts, timeZone: 'UTC' }).formatToParts(Date.UTC(y!, m! - 1, d!));
  return Object.fromEntries(f.map((p) => [p.type, p.value])) as Record<string, string>;
};

/** "శని, 21 నవంబర్" / "Sat, 21 Nov" — the design's date chip. */
export function chipDate(date: string, lang: Lang): string {
  const p = parts(date, lang, { weekday: 'short', day: 'numeric', month: lang === 'te' ? 'long' : 'short' });
  return `${p.weekday}, ${p.day} ${p.month}`;
}

/** "22 నవం" / "22 Nov" — shown after a time that falls on the next civil date. */
export function shortDate(date: string, lang: Lang): string {
  const p = parts(date, lang, { day: 'numeric', month: 'short' });
  return `${p.day} ${p.month}`;
}

export const jdNow = (now = Date.now()) => now / 86_400_000 + 2440587.5;

/** Civil date + n days (YYYY-MM-DD, calendar arithmetic in UTC). */
export function plusDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

/** Days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  const ms = (x: string) => { const [y, m, d] = x.split('-').map(Number); return Date.UTC(y!, m! - 1, d!); };
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

/** "11 డిసెంబర్" / "11 December". */
export function dayMonth(date: string, lang: Lang): string {
  const p = parts(date, lang, { day: 'numeric', month: 'long' });
  return `${p.day} ${p.month}`;
}

/** "21 నవంబర్ 2026" / "21 November 2026". */
export function longDate(date: string, lang: Lang): string {
  const p = parts(date, lang, { day: 'numeric', month: 'long', year: 'numeric' });
  return `${p.day} ${p.month} ${p.year}`;
}

/** "11 Dec" style short date with the day (for reminders and chips). */
export function shortDayMonth(date: string, lang: Lang): string {
  const p = parts(date, lang, { day: 'numeric', month: lang === 'te' ? 'long' : 'short' });
  return `${p.day} ${p.month}`;
}

/** "జూన్ 2024" / "Jun 2024". */
export function monthYear(date: string, lang: Lang): string {
  const p = parts(date, lang, { month: lang === 'te' ? 'long' : 'short', year: 'numeric' });
  return `${p.month} ${p.year}`;
}

/** "8 – 19 డిసెంబర్" when both days share a month, else "28 డిసెంబర్ – 3 జనవరి". */
export function dayRange(a: string, b: string, lang: Lang): string {
  if (a === b) return dayMonth(a, lang);
  const pa = parts(a, lang, { day: 'numeric', month: 'long' }), pb = parts(b, lang, { day: 'numeric', month: 'long' });
  return pa.month === pb.month ? `${pa.day} – ${pb.day} ${pb.month}` : `${pa.day} ${pa.month} – ${pb.day} ${pb.month}`;
}

/** Gregorian year of a civil date. */
export const yearOf = (date: string) => date.slice(0, 4);
