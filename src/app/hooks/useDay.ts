import { useEffect, useState } from 'react';
import type { DayPanchangam, DayPeriodView } from '../../engine/api';
import { getEngine, initEngine } from '../../engine/client';
import type { Place } from '../places';

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
