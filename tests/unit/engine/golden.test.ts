// Golden fixtures (CLAUDE.md "Verification"). Tolerances are fixed by the spec:
// DO NOT loosen them to make a row pass — report the disagreement instead.
import { beforeAll, describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import fixture from '../../fixtures/panchangam-golden.json';
import schema from '../../fixtures/panchangam-golden.schema.json';
import { createEngine } from '../../../src/engine/core/engine';
import { DEFAULT_EPHEMERIS_OPTIONS, loadEphemeris, type Body } from '../../../src/engine/ephemeris';
import { resolveLocal } from '../../../src/engine/core/time';
import type { AstroEngine } from '../../../src/engine/api';

const SUNRISE_TOLERANCE_S = 60; // ±1 min
const OTHER_TIME_TOLERANCE_S = 120; // ±2 min
const LONGITUDE_TOLERANCE_DEG = 0.01;

/** While the fixture's reference says "TO FILL", unverified SAMPLE rows are allowed. */
const PLACEHOLDER_MARK = 'TO FILL';

type Longitudes = { at: string } & Partial<Record<Body | 'ascendant', number>>;
type Row = {
  id: string;
  verified: boolean;
  place: { id: string; nameEn: string; lat: number; lon: number; tz: string; altitude?: number };
  date: string;
  expected: { sunrise: string; sunset?: string; longitudes?: Longitudes; panchangam?: Record<string, unknown> };
};
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
  if (unverified.length) it.todo(`replace SAMPLE rows with reference values: ${unverified.join(', ')}`);

  // Reference data that is typed in but not checked yet must be visible, never silently ignored.
  const phase3 = rows.flatMap((r) => Object.keys(r.expected.panchangam ?? {}).map((k) => `${r.id}.${k}`));
  if (phase3.length) it.todo(`Phase 3 will check panchangam fields: ${phase3.join(', ')}`);
});

describe('golden: sunrise ±1 min, sunset ±2 min, longitudes ±0.01°', () => {
  let engine: AstroEngine;
  beforeAll(async () => {
    engine = createEngine(() => loadEphemeris(DEFAULT_EPHEMERIS_OPTIONS));
    await engine.init();
  });

  for (const row of rows) {
    const label = `${row.id} · ${row.place.nameEn} ${row.date}${row.verified ? '' : ' (SAMPLE)'}`;

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
