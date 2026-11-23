// The pair being matched. In memory only (names and birth details never go in the URL).
import { create } from 'zustand';

export type MatchBasis = 'chart' | 'names';
export type Slot = 'bride' | 'groom';

type State = {
  basis: MatchBasis;
  /** Profile ids (chart basis). */
  brideId: string | null;
  groomId: string | null;
  /** Typed names (names basis) and the chosen nama-nakshatra candidate for each. */
  brideName: string;
  groomName: string;
  brideChoice: number;
  groomChoice: number;
  setBasis: (b: MatchBasis) => void;
  assign: (slot: Slot, id: string | null) => void;
  setName: (slot: Slot, name: string) => void;
  setChoice: (slot: Slot, i: number) => void;
  reset: () => void;
};

export const useMatch = create<State>()((set) => ({
  basis: 'chart',
  brideId: null,
  groomId: null,
  brideName: '',
  groomName: '',
  brideChoice: 0,
  groomChoice: 0,
  setBasis: (basis) => set({ basis }),
  assign: (slot, id) => set(slot === 'bride' ? { brideId: id } : { groomId: id }),
  setName: (slot, name) => set(slot === 'bride' ? { brideName: name, brideChoice: 0 } : { groomName: name, groomChoice: 0 }),
  setChoice: (slot, i) => set(slot === 'bride' ? { brideChoice: i } : { groomChoice: i }),
  reset: () => set({ basis: 'chart', brideId: null, groomId: null, brideName: '', groomName: '', brideChoice: 0, groomChoice: 0 }),
}));
