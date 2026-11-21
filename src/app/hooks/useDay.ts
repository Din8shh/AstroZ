import { useEffect, useState } from 'react';
import type { DayPanchangam, DayPeriodView } from '../../engine/api';
import { getEngine, initEngine } from '../../engine/client';
import { DEFAULT_PLACE, placeById, type Place } from '../places';

export type DayState =
  | { status: 'loading' }
  | { status: 'ready'; panchangam: DayPanchangam; periods: DayPeriodView[] }
  | { status: 'error'; error: string };

/** Panchangam + day periods for a civil date and place, computed in the engine worker. */
export function useDay(date: string, place: Place): DayState {
  const [state, setState] = useState<DayState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    const geo = { lat: place.lat, lon: place.lon, tz: place.tz };
    (async () => {
      await initEngine();
      const engine = getEngine();
      const [panchangam, periods] = await Promise.all([engine.panchangam(date, geo), engine.dayPeriods(date, geo)]);
      if (live) setState({ status: 'ready', panchangam, periods });
    })().catch((err: unknown) => {
      if (live) setState({ status: 'error', error: err instanceof Error ? err.name : 'Error' });
    });
    return () => { live = false; };
  }, [date, place.lat, place.lon, place.tz]);
  return state;
}

/** Ticks once a minute so "now" markers move. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** The place for an id from public/data/cities.json; Hyderabad until it loads or if the id is unknown. */
export function usePlace(id: string): Place {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  useEffect(() => {
    let live = true;
    placeById(id).then((p) => { if (live) setPlace(p ?? DEFAULT_PLACE); }).catch(() => undefined);
    return () => { live = false; };
  }, [id]);
  return place;
}

export type StrengthState = { status: 'none' } | { status: 'loading' } | { status: 'ready'; strength: import('../../engine/api').DayStrength } | { status: 'error' };

/** Tarabalam + chandrabalam for a person (birth nakshatra and rasi) on a panchangam day. */
export function useDayStrength(person: { nakshatra: number; rasi: number } | null, date: string, place: Place): StrengthState {
  const [state, setState] = useState<StrengthState>({ status: 'none' });
  const n = person?.nakshatra, r = person?.rasi;
  useEffect(() => {
    if (!n || !r) { setState({ status: 'none' }); return; }
    let live = true;
    setState({ status: 'loading' });
    (async () => {
      await initEngine();
      const strength = await getEngine().dayStrength({ nakshatra: n, rasi: r }, date, { lat: place.lat, lon: place.lon, tz: place.tz });
      if (live) setState({ status: 'ready', strength });
    })().catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
  }, [n, r, date, place.lat, place.lon, place.tz]);
  return state;
}
