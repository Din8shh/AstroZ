// Muhurtham finder and New house state: the query and its last result. In memory only — participants'
// birth stars never go in the URL (the detail route carries only the civil date).
import { create } from 'zustand';
import type { Door, EventId, MuhurthamResult } from '../engine/api';
import type { Place } from './places';

export type RangePreset = '90' | 'week' | 'month' | 'custom';

export type Search = {
  event: EventId;
  from: string;
  days: number;
  preset: RangePreset;
  place: Place;
  peopleIds: string[];
  door?: Door;
};

type State = {
  /** Which flow owns the result (the finder or the New house screen). */
  flow: 'finder' | 'house' | null;
  search: Search | null;
  result: MuhurthamResult | null;
  setResult: (flow: 'finder' | 'house', search: Search, result: MuhurthamResult) => void;
  clear: () => void;
};

export const useMuhurtham = create<State>()((set) => ({
  flow: null,
  search: null,
  result: null,
  setResult: (flow, search, result) => set({ flow, search, result }),
  clear: () => set({ flow: null, search: null, result: null }),
}));
