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
