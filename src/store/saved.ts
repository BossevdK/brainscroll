import { create } from 'zustand';
import type { Fact } from '../cards/types';
import { loadJSONArray, saveJSON } from './persist';

type SavedFact = Fact & { savedAt: number };
const KEY = 'savedFacts.v1';

export const useSaved = create<{
  facts: SavedFact[];
  toggle: (f: Fact) => boolean; // returns true if now saved
  remove: (id: string) => void;
}>((set, get) => ({
  facts: loadJSONArray<SavedFact>(KEY),
  toggle: (f) => {
    const exists = get().facts.some((x) => x.id === f.id);
    const facts = exists ? get().facts.filter((x) => x.id !== f.id) : [{ ...f, savedAt: Date.now() }, ...get().facts];
    set({ facts });
    saveJSON(KEY, facts);
    return !exists;
  },
  remove: (id) => {
    const facts = get().facts.filter((x) => x.id !== id);
    set({ facts });
    saveJSON(KEY, facts);
  },
}));
