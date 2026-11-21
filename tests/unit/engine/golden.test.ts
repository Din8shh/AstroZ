// Golden fixtures (CLAUDE.md "Verification"). Tolerances are fixed by the spec:
// DO NOT loosen them to make a row pass — report the disagreement instead.
import { beforeAll, describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import fixture from '../../fixtures/panchangam-golden.json';
import schema from '../../fixtures/panchangam-golden.schema.json';
import { createEngine } from '../../../src/engine/core/engine';
import { loadEphemeris } from '../../../src/engine/ephemeris';
import { resolveLocal } from '../../../src/engine/core/time';
import type { AstroEngine } from '../../../src/engine/api';

const SUNRISE_TOLERANCE_S = 60; // ±1 min
const OTHER_TIME_TOLERANCE_S = 120; // ±2 min
const LONGITUDE_TOLERANCE_DEG = 0.01;

type Row = (typeof fixture.rows)[number] & {
  expected: { sunset?: string; longitudes?: { at: string; sun?: number; moon?: number } };
};

const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const splitAt = (s: string) => {
  const [date = '', time = ''] = s.split('T');
  return { date, time };
};

describe('panchangam-golden.json', () => {
  it('matches its JSON schema', () => {
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(schema);
    const ok = validate(fixture);
    expect(validate.errors ?? [], JSON.stringify(validate.errors, null, 2)).toEqual([]);
    expect(ok).toBe(true);
  });

  it('row ids are unique', () => {
    const ids = fixture.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  const unverified = fixture.rows.filter((r) => !r.verified).map((r) => r.id);
  if (unverified.length) it.todo(`replace SAMPLE rows with reference values: ${unverified.join(', ')}`);
});

describe('golden: sunrise ±1 min, sunset ±2 min, Sun/Moon ±0.01°', () => {
  let engine: AstroEngine;
  beforeAll(async () => {
    engine = createEngine(() =>
      loadEphemeris({ sunrise: fixture.settings.sunrise as 'upper-limb', node: fixture.settings.node as 'mean' }),
    );
    await engine.init();
  });

  for (const row of fixture.rows as Row[]) {
    const label = `${row.id} · ${row.place.nameEn} ${row.date}${row.verified ? '' : ' (SAMPLE)'}`;

    it(`${label} · sunrise`, async () => {
      const got = await engine.sunTimes(row.date, row.place);
      expect(got.sunrise, 'no sunrise found').not.toBeNull();
      const want = resolveLocal({ date: row.date, time: row.expected.sunrise, tz: row.place.tz }).jdUt;
      const diffS = Math.abs(got.sunrise!.jdUt - want) * 86_400;
      expect(diffS, `sunrise ${got.sunrise!.time} vs ${row.expected.sunrise} (${diffS.toFixed(0)} s)`).toBeLessThanOrEqual(SUNRISE_TOLERANCE_S);
    });

    if (row.expected.sunset) {
      const sunset = row.expected.sunset;
      it(`${label} · sunset`, async () => {
        const got = await engine.sunTimes(row.date, row.place);
        const want = resolveLocal({ date: row.date, time: sunset, tz: row.place.tz }).jdUt;
        const diffS = Math.abs(got.sunset!.jdUt - want) * 86_400;
        expect(diffS, `sunset ${got.sunset!.time} vs ${sunset}`).toBeLessThanOrEqual(OTHER_TIME_TOLERANCE_S);
      });
    }

    const lon = row.expected.longitudes;
    if (lon) {
      for (const body of ['sun', 'moon'] as const) {
        const want = lon[body];
        if (want === undefined) continue;
        it(`${label} · ${body} sidereal longitude`, async () => {
          const got = await engine.positions({ ...splitAt(lon.at), tz: row.place.tz });
          const d = angleDiff(got.bodies[body].longitude, want);
          expect(d, `${body} ${got.bodies[body].longitude.toFixed(4)}° vs ${want}° (Δ ${d.toFixed(4)}°)`).toBeLessThanOrEqual(LONGITUDE_TOLERANCE_DEG);
        });
      }
    }
  }
});
