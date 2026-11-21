import { useEffect, useState } from 'react';
import type { BirthChart, Name, NamaResult } from '../../engine/api';
import { getEngine, initEngine } from '../../engine/client';
import { placeById } from '../places';
import type { Profile } from '../profiles';

type Names = { rasis: Name[]; rasisCompound: Name[]; nakshatras: Name[] };
let namesCache: Promise<Names> | null = null;

/** Rasi / nakshatra names from the engine tables (loaded once). */
export function useNames(): Names | null {
  const [names, setNames] = useState<Names | null>(null);
  useEffect(() => {
    let live = true;
    namesCache ??= initEngine().then(() => getEngine().names());
    namesCache.then((n) => { if (live) setNames(n); }).catch(() => { namesCache = null; });
    return () => { live = false; };
  }, []);
  return names;
}

export type ChartState =
  | { status: 'loading' }
  | { status: 'ready'; chart: BirthChart | null; nama: NamaResult | null; placeName?: { en: string; te?: string } }
  | { status: 'error' };

/** Birth chart (when birth details exist) and nama nakshatra for a profile, computed in the worker. */
export function useChart(profile: Profile | undefined): ChartState {
  const [state, setState] = useState<ChartState>({ status: 'loading' });
  const key = profile ? JSON.stringify([profile.name, profile.birth]) : '';
  useEffect(() => {
    if (!profile) return;
    let live = true;
    setState({ status: 'loading' });
    (async () => {
      await initEngine();
      const engine = getEngine();
      const nama = await engine.namaNakshatra(profile.name);
      let chart: BirthChart | null = null;
      let placeName: { en: string; te?: string } | undefined;
      if (profile.birth) {
        const place = await placeById(profile.birth.placeId);
        if (!place) throw new Error('unknown place');
        placeName = { en: place.nameEn, ...(place.nameTe && { te: place.nameTe }) };
        chart = await engine.birthChart({
          date: profile.birth.date,
          ...(profile.birth.time && { time: profile.birth.time }),
          timeKnown: profile.birth.timeKnown,
          place: { lat: place.lat, lon: place.lon, tz: place.tz },
        });
      }
      if (live) setState({ status: 'ready', chart, nama, ...(placeName && { placeName }) });
    })().catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** The numbers stored on a profile (SPEC §5 `derived`), from a computed chart. Lagna only when the time is known. */
export function derivedFrom(chart: BirthChart | null, nama: NamaResult | null): NonNullable<Profile['derived']> {
  const namaNakshatra = nama ? [...new Set(nama.candidates.map((c) => c.nakshatra))] : undefined;
  return {
    ...(chart && { rasi: chart.moon.rasi, nakshatra: chart.moon.nakshatra, pada: chart.moon.pada }),
    ...(chart?.lagna && { lagna: chart.lagna.rasi }),
    ...(namaNakshatra?.length && { namaNakshatra }),
  };
}
