// Golden fixtures (CLAUDE.md "Verification"). Tolerances are fixed by the spec:
// DO NOT loosen them to make a row pass — report the disagreement instead.
import { beforeAll, describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import fixture from '../../fixtures/panchangam-golden.json';
import schema from '../../fixtures/panchangam-golden.schema.json';
import { createEngine } from '../../../src/engine/core/engine';
import { DEFAULT_EPHEMERIS_OPTIONS, loadEphemeris, type Body } from '../../../src/engine/ephemeris';
import { resolveLocal } from '../../../src/engine/core/time';
import type { AstroEngine, DayPeriodView, LocalTime, PeriodKind } from '../../../src/engine/api';

const SUNRISE_TOLERANCE_S = 60; // ±1 min
const OTHER_TIME_TOLERANCE_S = 120; // ±2 min
const LONGITUDE_TOLERANCE_DEG = 0.01;

/** While the fixture's reference says "TO FILL", unverified SAMPLE rows are allowed. */
const PLACEHOLDER_MARK = 'TO FILL';

type Longitudes = { at: string } & Partial<Record<Body | 'ascendant', number>>;
type Span = { start: string; end: string };
type AngaRef = { number: number; name?: string; endsAt: string };
type Panchangam = {
  vara?: number; paksha?: 'shukla' | 'krishna'; masa?: number; adhika?: boolean; samvatsara?: number; shaka?: number;
  tithi?: AngaRef[]; nakshatra?: AngaRef[]; yoga?: AngaRef[]; karana?: AngaRef[];
  rahuKalam?: Span; yamagandam?: Span; gulikaKalam?: Span; abhijit?: Span | null;
  durmuhurtham?: Span[]; varjyam?: Span[]; amritaKalam?: Span[];
  /** Period fields the reference was only partly read for: each listed slot must exist, extra engine slots are allowed. */
  partial?: (keyof typeof PERIOD_FIELDS)[];
};
type Row = {
  id: string;
  verified: boolean;
  place: { id: string; nameEn: string; lat: number; lon: number; tz: string; altitude?: number };
  date: string;
  expected: { sunrise: string; sunset?: string; longitudes?: Longitudes; panchangam?: Panchangam };
};

/** Fixture field → engine period kind. */
const PERIOD_FIELDS = {
  rahuKalam: 'rahu', yamagandam: 'yamagandam', gulikaKalam: 'gulika', abhijit: 'abhijit',
  durmuhurtham: 'durmuhurtham', varjyam: 'varjyam', amritaKalam: 'amrita',
} as const satisfies Record<string, PeriodKind>;
const rows = fixture.rows as Row[];

const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const splitAt = (s: string) => {
  const [date = '', time = ''] = s.split('T');
  return { date, time };
};

describe('panchangam-golden.json', () => {
  it('matches its JSON schema', () => {
    const validate = new Ajv2020({ allErrors: true }).compile(schema);
    const ok = validate(fixture);
    expect(validate.errors ?? [], JSON.stringify(validate.errors, null, 2)).toEqual([]);
    expect(ok).toBe(true);
  });

  it('row ids are unique', () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses the same settings as the app engine (src/engine/ephemeris DEFAULT_EPHEMERIS_OPTIONS)', () => {
    // Otherwise the fixtures could pass on settings the app does not run with.
    const { ayanamsa, ...rest } = fixture.settings;
    expect(ayanamsa).toBe('lahiri');
    expect(rest).toEqual(DEFAULT_EPHEMERIS_OPTIONS);
  });

  it(`every row is verified once the reference no longer says "${PLACEHOLDER_MARK}"`, () => {
    if (fixture.reference.includes(PLACEHOLDER_MARK)) return;
    expect(rows.filter((r) => !r.verified).map((r) => r.id)).toEqual([]);
  });

  const unverified = rows.filter((r) => !r.verified).map((r) => r.id);
  if (unverified.length) it.todo(`a person must check these rows against the reference and set verified: true: ${unverified.join(', ')}`);

  it('every panchangam field in the fixtures is one this test checks', () => {
    // Reference data that is typed in but not checked must never be silently ignored.
    const checked = new Set(['partial', 'vara', 'paksha', 'masa', 'adhika', 'samvatsara', 'shaka', 'tithi', 'nakshatra', 'yoga', 'karana', ...Object.keys(PERIOD_FIELDS)]);
    const unchecked = rows.flatMap((r) => Object.keys(r.expected.panchangam ?? {}).filter((k) => !checked.has(k)).map((k) => `${r.id}.${k}`));
    expect(unchecked).toEqual([]);
  });
});

describe('golden: sunrise ±1 min, sunset/ends/periods ±2 min, longitudes ±0.01°', () => {
  let engine: AstroEngine;
  beforeAll(async () => {
    engine = createEngine(() => loadEphemeris(DEFAULT_EPHEMERIS_OPTIONS));
    await engine.init();
  });

  for (const row of rows) {
    const label = `${row.id} · ${row.place.nameEn} ${row.date}${row.verified ? '' : ' (unverified)'}`;

    it(`${label} · sunrise`, async () => {
      const got = await engine.sunTimes(row.date, row.place);
      expect(got.sunrise, 'no sunrise found').not.toBeNull();
      const want = resolveLocal({ date: row.date, time: row.expected.sunrise, tz: row.place.tz }).jdUt;
      const diffS = Math.abs(got.sunrise!.jdUt - want) * 86_400;
      expect(diffS, `sunrise ${got.sunrise!.time} vs ${row.expected.sunrise} (${diffS.toFixed(0)} s)`).toBeLessThanOrEqual(SUNRISE_TOLERANCE_S);
    });

    const sunset = row.expected.sunset;
    if (sunset) {
      it(`${label} · sunset`, async () => {
        const got = await engine.sunTimes(row.date, row.place);
        expect(got.sunset, 'no sunset found').not.toBeNull();
        const want = resolveLocal({ date: row.date, time: sunset, tz: row.place.tz }).jdUt;
        const diffS = Math.abs(got.sunset!.jdUt - want) * 86_400;
        expect(diffS, `sunset ${got.sunset!.time} vs ${sunset} (${diffS.toFixed(0)} s)`).toBeLessThanOrEqual(OTHER_TIME_TOLERANCE_S);
      });
    }

    const pc = row.expected.panchangam;
    if (pc) {
      const tz = row.place.tz;
      const jd = (local: string) => resolveLocal({ ...splitAt(local), tz }).jdUt;
      const within = (got: LocalTime, want: string, what: string) => {
        const diffS = Math.abs(got.jdUt - jd(want)) * 86_400;
        expect(diffS, `${what}: ${got.date} ${got.time} vs ${want} (${diffS.toFixed(0)} s)`).toBeLessThanOrEqual(OTHER_TIME_TOLERANCE_S);
      };

      it(`${label} · vara, paksha, masa, samvatsara`, async () => {
        const p = await engine.panchangam(row.date, row.place);
        if (pc.vara !== undefined) expect(p.vara.number, 'vara').toBe(pc.vara);
        if (pc.paksha !== undefined) expect(p.paksha.id, 'paksha').toBe(pc.paksha);
        if (pc.masa !== undefined) expect(p.masa.number, 'masa').toBe(pc.masa);
        if (pc.adhika !== undefined) expect(p.masa.adhika, 'adhika').toBe(pc.adhika);
        if (pc.samvatsara !== undefined) expect(p.samvatsara.number, 'samvatsara').toBe(pc.samvatsara);
        if (pc.shaka !== undefined) expect(p.samvatsara.shaka, 'shaka').toBe(pc.shaka);
      });

      for (const field of ['tithi', 'nakshatra', 'yoga', 'karana'] as const) {
        const want = pc[field];
        if (!want) continue;
        it(`${label} · ${field} end times ±2 min`, async () => {
          const got = (await engine.panchangam(row.date, row.place))[field];
          // The reference lists the angas that end during the day, in order, starting with the one at sunrise.
          expect(got.slice(0, want.length).map((a) => a.number), `${field} sequence`).toEqual(want.map((w) => w.number));
          want.forEach((w, i) => within(got[i]!.end, w.endsAt, `${field} ${w.name ?? w.number} end`));
        });
      }

      for (const [field, kind] of Object.entries(PERIOD_FIELDS) as [keyof typeof PERIOD_FIELDS, PeriodKind][]) {
        if (!(field in pc)) continue;
        const raw = pc[field];
        const want: Span[] = raw === null || raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
        const partial = pc.partial?.includes(field) ?? false;
        it(`${label} · ${field} boundaries ±2 min${partial ? ' (partial read)' : ''}`, async () => {
          const all = (await engine.dayPeriods(row.date, row.place)).filter((p: DayPeriodView) => p.kind === kind);
          // A partial read lists only the slots the reader saw: match each to the nearest engine slot, in order.
          const got = partial ? want.map((w) => all.reduce((a, b) => (Math.abs(b.start.jdUt - jd(w.start)) < Math.abs(a.start.jdUt - jd(w.start)) ? b : a))) : all;
          if (!partial) expect(got.length, `${field}: ${got.map((g) => `${g.start.time}–${g.end.time}`).join(', ') || 'none'}`).toBe(want.length);
          want.forEach((w, i) => {
            within(got[i]!.start, w.start, `${field} start`);
            within(got[i]!.end, w.end, `${field} end`);
          });
        });
      }
    }

    const lon = row.expected.longitudes;
    if (!lon) continue;
    for (const [key, want] of Object.entries(lon)) {
      if (key === 'at' || typeof want !== 'number') continue;
      it(`${label} · ${key} sidereal longitude`, async () => {
        const at = { ...splitAt(lon.at), tz: row.place.tz };
        const got = key === 'ascendant'
          ? await engine.ascendant(at, row.place)
          : (await engine.positions(at)).bodies[key as Body].longitude;
        const d = angleDiff(got, want);
        expect(d, `${key} ${got.toFixed(4)}° vs ${want}° (Δ ${d.toFixed(4)}°)`).toBeLessThanOrEqual(LONGITUDE_TOLERANCE_DEG);
      });
    }
  }
});
