import { describe, expect, it } from 'vitest';
import { addDays, jdFromUnixMs, resolveLocal, startOfLocalDay, TimeInputError, toLocal, unixMsFromJd } from '../../../src/engine/core/time';

describe('Julian Day', () => {
  it('J2000.0 = 2000-01-01T12:00Z = JD 2451545.0', () => {
    expect(jdFromUnixMs(Date.UTC(2000, 0, 1, 12))).toBe(2451545.0);
    expect(resolveLocal({ date: '2000-01-01', time: '17:30', tz: 'Asia/Kolkata' }).jdUt).toBeCloseTo(2451545.0, 9);
  });
  it('round-trips within the precision of a double-precision JD (~40 µs)', () => {
    const ms = Date.UTC(1995, 7, 14, 0, 10, 0);
    expect(Math.abs(unixMsFromJd(jdFromUnixMs(ms)) - ms)).toBeLessThan(0.05);
  });
});

describe('historical IANA offsets (Asia/Kolkata)', () => {
  it.each([
    ['1900-06-01', 321 + 10 / 60, 'Madras time +05:21:10'],
    ['1942-06-01', 330, 'IST +05:30'],
    ['1943-06-01', 390, 'war time +06:30'],
    ['1946-06-01', 330, 'IST +05:30'],
    ['1995-08-14', 330, 'IST +05:30'],
  ])('%s → %d min (%s)', (date, offset) => {
    expect(resolveLocal({ date, time: '12:00', tz: 'Asia/Kolkata' }).offsetMinutes).toBeCloseTo(offset, 6);
  });

  it('a 1943 birth time converts to UT with +06:30', () => {
    const r = resolveLocal({ date: '1943-06-01', time: '06:30', tz: 'Asia/Kolkata' });
    expect(r.utc).toBe('1943-06-01T00:00:00.000Z');
  });
});

describe('daylight saving (America/Chicago)', () => {
  it('flags a wall time inside the spring-forward gap and moves it forward', () => {
    const r = resolveLocal({ date: '2026-03-08', time: '02:30', tz: 'America/Chicago' });
    expect(r.note).toBe('gap');
    expect(r.utc).toBe('2026-03-08T08:30:00.000Z'); // 03:30 CDT
  });
  it('flags an ambiguous fall-back wall time and uses the first occurrence (CDT)', () => {
    const r = resolveLocal({ date: '2026-11-01', time: '01:30', tz: 'America/Chicago' });
    expect(r.note).toBe('ambiguous');
    expect(r.offsetMinutes).toBe(-300);
    expect(r.utc).toBe('2026-11-01T06:30:00.000Z');
  });
  it('normal times are ok', () => {
    expect(resolveLocal({ date: '2026-07-04', time: '09:00', tz: 'America/Chicago' }).note).toBe('ok');
  });
});

describe('local ↔ UT', () => {
  it('toLocal renders the zone-local wall time', () => {
    const jd = resolveLocal({ date: '2026-11-21', time: '06:24:05', tz: 'Asia/Kolkata' }).jdUt;
    expect(toLocal(jd, 'Asia/Kolkata')).toMatchObject({ date: '2026-11-21', time: '06:24:05', offsetMinutes: 330 });
    expect(toLocal(jd, 'America/Chicago')).toMatchObject({ date: '2026-11-20', time: '18:54:05' });
  });
  it('startOfLocalDay is local midnight', () => {
    expect(toLocal(startOfLocalDay('2026-03-08', 'America/Chicago'), 'America/Chicago').time).toBe('00:00:00');
    expect(toLocal(startOfLocalDay('2026-11-21', 'Asia/Kolkata'), 'UTC')).toMatchObject({ date: '2026-11-20', time: '18:30:00' });
  });
});

describe('bad input', () => {
  it.each([
    [{ date: '2026-02-31', time: '10:00', tz: 'Asia/Kolkata' }],
    [{ date: '2026-13-01', tz: 'Asia/Kolkata' }],
    [{ date: '21/11/2026', tz: 'Asia/Kolkata' }],
    [{ date: '2026-11-21', time: '25:00', tz: 'Asia/Kolkata' }],
    [{ date: '2026-11-21', time: '10:00', tz: 'Mars/Olympus' }],
  ])('rejects %o', (m) => {
    expect(() => resolveLocal(m)).toThrow(TimeInputError);
  });

  it('error messages do not echo the input (it may be a birth date)', () => {
    try {
      resolveLocal({ date: '1994-02-31', time: '10:00', tz: 'Asia/Kolkata' });
      expect.unreachable();
    } catch (e) {
      expect(String((e as Error).message)).not.toMatch(/1994|31|10:00/);
    }
  });
});

describe('addDays', () => {
  it('crosses month, year and leap day', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
  });
});
