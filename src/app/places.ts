import data from './data/places.json';
import type { Lang } from './types';

export type Place = { id: string; nameEn: string; nameTe?: string; lat: number; lon: number; tz: string };

export const PLACES: Place[] = data.items;

export function placeById(id: string): Place {
  return PLACES.find((p) => p.id === id) ?? PLACES[0]!;
}

export const placeName = (p: Place, lang: Lang) => (lang === 'te' && p.nameTe ? p.nameTe : p.nameEn);
