// iCalendar (.ics) export for a muhurtham window (RFC 5545). Only the event name, place and times go in —
// never names' birth details. Times are written in UTC so any calendar app shows them in its own zone.
const pad = (n: number) => String(n).padStart(2, '0');

/** JD UT → 20261211T041000Z */
export function icsTime(jdUt: number): string {
  const d = new Date(Math.round((jdUt - 2440587.5) * 86_400_000));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape TEXT values (RFC 5545 §3.3.11). */
const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
    cur += ch; len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export type IcsEvent = {
  uid: string;
  title: string;
  /** Timed event (JD UT)… */
  start?: number;
  end?: number;
  /** …or an all-day event over civil dates (inclusive). */
  allDay?: { start: string; end: string };
  location?: string;
  description?: string;
  /** Minutes before the start for a reminder. */
  alarmMinutes?: number;
  /** e.g. FREQ=WEEKLY;BYDAY=FR */
  rrule?: string;
  /** For the DTSTAMP field (JD UT); defaults to now. */
  stamp?: number;
};

const dateValue = (d: string) => d.replace(/-/g, '');
const nextDate = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

function vevent(ev: IcsEvent): string[] {
  const stamp = ev.stamp ?? Date.now() / 86_400_000 + 2440587.5;
  const when = ev.allDay
    ? [`DTSTART;VALUE=DATE:${dateValue(ev.allDay.start)}`, `DTEND;VALUE=DATE:${dateValue(nextDate(ev.allDay.end))}`]
    : [`DTSTART:${icsTime(ev.start!)}`, `DTEND:${icsTime(ev.end!)}`];
  return [
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${icsTime(stamp)}`,
    ...when,
    ...(ev.rrule ? [`RRULE:${ev.rrule}`] : []),
    `SUMMARY:${text(ev.title)}`,
    ...(ev.location ? [`LOCATION:${text(ev.location)}`] : []),
    ...(ev.description ? [`DESCRIPTION:${text(ev.description)}`] : []),
    ...(ev.alarmMinutes !== undefined ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text(ev.title)}`, `TRIGGER:-PT${ev.alarmMinutes}M`, 'END:VALARM'] : []),
    'END:VEVENT',
  ];
}

export function buildIcs(events: IcsEvent | IcsEvent[]): string {
  const list = Array.isArray(events) ? events : [events];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AstroZ//Muhurtham//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...list.flatMap(vevent), 'END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(ics: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
