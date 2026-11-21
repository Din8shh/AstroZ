// Swiss Ephemeris adapter (swisseph-wasm). The ONLY module allowed to import the library.
// Licence: Swiss Ephemeris is AGPL-3.0 or commercial (docs/SPEC.md §11); swisseph-wasm is GPL-3.0-or-later.
import SwissEph from 'swisseph-wasm';
import libPkg from 'swisseph-wasm/package.json';
import type { Body, BodyPosition, Ephemeris, EphemerisOptions, GeoLocation, SunriseMode } from './types';
import { BODIES } from './types';

// Standard atmosphere for refraction at rise/set (Swiss Ephemeris defaults).
const PRESSURE_HPA = 1013.25;
const TEMPERATURE_C = 15;

// swe_rise_trans event and flag bits (swephexp.h). The wrapper's types do not declare them.
const CALC_RISE = 1;
const CALC_SET = 2;
const BIT_DISC_CENTER = 256;
const BIT_NO_REFRACTION = 512;
const BIT_GEOCTR_NO_ECL_LAT = 128;

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

function riseBits(mode: SunriseMode): number {
  switch (mode) {
    case 'upper-limb':
      return 0;
    case 'disc-centre':
      return BIT_DISC_CENTER;
    case 'hindu':
      return BIT_DISC_CENTER | BIT_NO_REFRACTION | BIT_GEOCTR_NO_ECL_LAT;
  }
}

export async function createSwissEphemeris(options: EphemerisOptions = {}): Promise<Ephemeris> {
  const opts: Required<EphemerisOptions> = { node: 'mean', sunrise: 'upper-limb', ...options };
  const swe = new SwissEph();
  await swe.initSwissEph();
  swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

  // Bundled .se1 files cover ~1800–2400 AD; outside that Swiss Ephemeris falls back to Moshier.
  const EPHE = swe.SEFLG_SWIEPH;
  const SIDEREAL = EPHE | swe.SEFLG_SIDEREAL | swe.SEFLG_SPEED;
  const nodeId = opts.node === 'true' ? swe.SE_TRUE_NODE : swe.SE_MEAN_NODE;

  const planetId: Record<Exclude<Body, 'ketu'>, number> = {
    sun: swe.SE_SUN,
    moon: swe.SE_MOON,
    mars: swe.SE_MARS,
    mercury: swe.SE_MERCURY,
    jupiter: swe.SE_JUPITER,
    venus: swe.SE_VENUS,
    saturn: swe.SE_SATURN,
    rahu: nodeId,
  };

  const calc = (id: number, jdUt: number): BodyPosition => {
    const r = swe.calc_ut(jdUt, id, SIDEREAL); // throws with the library's message on error
    return { longitude: norm360(r[0] ?? NaN), latitude: r[1] ?? NaN, speed: r[3] ?? NaN };
  };

  const position = (body: Body, jdUt: number): BodyPosition => {
    if (body === 'ketu') {
      const rahu = calc(planetId.rahu, jdUt);
      return { longitude: norm360(rahu.longitude + 180), latitude: -rahu.latitude, speed: rahu.speed };
    }
    return calc(planetId[body], jdUt);
  };

  const ayanamsa = (jdUt: number): number => {
    const a = swe.get_ayanamsa_ex_ut(jdUt, EPHE);
    if (a === null) throw new Error(`ayanamsa failed: ${swe.getLastError()}`);
    return a;
  };

  const riseSet = (event: number, jdUtFrom: number, at: GeoLocation): number | null => {
    const geopos = [at.lon, at.lat, at.altitude ?? 0];
    const tret = swe.rise_trans(jdUtFrom, swe.SE_SUN, '', EPHE, event | riseBits(opts.sunrise), geopos, PRESSURE_HPA, TEMPERATURE_C);
    const t = tret?.[0];
    return t === undefined || !Number.isFinite(t) || t <= 0 ? null : t;
  };

  return {
    name: `Swiss Ephemeris ${swe.version()} (swisseph-wasm ${libPkg.version})`,
    options: opts,
    ayanamsa,
    position,
    positions: (jdUt) => {
      const out = {} as Record<Body, BodyPosition>;
      for (const b of BODIES) if (b !== 'ketu') out[b] = position(b, jdUt);
      const rahu = out.rahu;
      out.ketu = { longitude: norm360(rahu.longitude + 180), latitude: -rahu.latitude, speed: rahu.speed };
      return out;
    },
    sunrise: (jdUtFrom, at) => riseSet(CALC_RISE, jdUtFrom, at),
    sunset: (jdUtFrom, at) => riseSet(CALC_SET, jdUtFrom, at),
    ascendant: (jdUt, at) => {
      // Tropical ascendant minus the same (true) ayanamsa used for planets.
      const h = swe.houses(jdUt, at.lat, at.lon, 'W');
      const asc = h.ascmc[0];
      if (asc === undefined) throw new Error('houses() returned no ascendant');
      return norm360(asc - ayanamsa(jdUt));
    },
  };
}
