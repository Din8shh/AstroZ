import { describe, expect, it } from 'vitest';
import { buildIcs } from '../../src/app/ics';

describe('.ics export (RFC 5545)', () => {
  it('escapes ; , \\ and newlines in text values', () => {
    const ics = buildIcs({ uid: 'u', title: 'a;b,c\\d\ne', start: 2461366.5, end: 2461366.6, stamp: 2461366.5 });
    expect(ics).toContain('SUMMARY:a\\;b\\,c\\\\d\\ne');
  });
  it('all-day and weekly events', () => {
    const ics = buildIcs({ uid: 'w', title: 'Friday saving', allDay: { start: '2026-11-27', end: '2026-11-27' }, rrule: 'FREQ=WEEKLY;BYDAY=FR', stamp: 2461366.5 });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261127');
    expect(ics).toContain('DTEND;VALUE=DATE:20261128');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR');
  });
});
