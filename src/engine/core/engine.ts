// Engine logic over the Ephemeris interface. Runs in the worker, and directly in Vitest.
import type { AstroEngine, EngineInfo, GeoPlace, PositionsResult, SunTimes } from '../api';
import type { Ephemeris } from '../ephemeris/types';
import { addDays, resolveLocal, startOfLocalDay, toLocal, type LocalMoment } from './time';

export function createEngine(load: () => Promise<Ephemeris>): AstroEngine {
  let eph: Ephemeris | null = null;
  let info: EngineInfo | null = null;
  let loading: Promise<EngineInfo> | null = null;

  const init = (): Promise<EngineInfo> => {
    if (info) return Promise.resolve(info);
    loading ??= (async () => {
      const t0 = performance.now();
      eph = await load();
      // A broken wasm or data file shows up here rather than as wrong readings later.
      const ayanamsaJ2000 = eph.ayanamsa(2451545.0);
      if (!(Math.abs(ayanamsaJ2000 - 23.853) < 0.01)) throw new Error(`ephemeris self-check failed: ${ayanamsaJ2000}`);
      info = {
        ephemeris: eph.name,
        ayanamsa: 'lahiri',
        node: eph.options.node,
        sunrise: eph.options.sunrise,
        initMs: Math.round(performance.now() - t0),
        ayanamsaJ2000,
      };
      return info;
    })();
    return loading;
  };

  const ready = async (): Promise<Ephemeris> => {
    await init();
    if (!eph) throw new Error('ephemeris failed to load');
    return eph;
  };

  return {
    init,

    async positions(at: LocalMoment): Promise<PositionsResult> {
      const e = await ready();
      const r = resolveLocal(at);
      return { jdUt: r.jdUt, utc: r.utc, note: r.note, ayanamsa: e.ayanamsa(r.jdUt), bodies: e.positions(r.jdUt) };
    },

    async sunTimes(date: string, place: GeoPlace): Promise<SunTimes> {
      const e = await ready();
      const loc = { lat: place.lat, lon: place.lon, ...(place.altitude !== undefined && { altitude: place.altitude }) };
      const dayStart = startOfLocalDay(date, place.tz);
      const dayEnd = startOfLocalDay(addDays(date, 1), place.tz);
      // Polar night: the library returns null. A sunrise on a later civil date is not this date's.
      const found = e.sunrise(dayStart, loc);
      const sunrise = found !== null && found < dayEnd ? found : null;
      const sunset = e.sunset(sunrise ?? dayStart, loc);
      const nextSunrise = sunrise === null ? null : e.sunrise(sunrise + 1 / 1440, loc);
      const local = (jd: number | null) => (jd === null ? null : toLocal(jd, place.tz));
      return { sunrise: local(sunrise), sunset: local(sunset), nextSunrise: local(nextSunrise) };
    },

    async ascendant(at: LocalMoment, place: GeoPlace): Promise<number> {
      const e = await ready();
      return e.ascendant(resolveLocal(at).jdUt, { lat: place.lat, lon: place.lon });
    },
  };
}
