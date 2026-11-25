import { create } from 'zustand';
import type { Category } from '../cards/types';
import { loadJSON, saveJSON } from './persist';

type CatStat = { answered: number; correct: number };

type Stats = {
  byCategory: Partial<Record<Category, CatStat>>;
  puzzlesAnswered: number;
  puzzlesCorrect: number;
  bestStreak: number;
};

const KEY = 'stats.v1';
const EMPTY: Stats = { byCategory: {}, puzzlesAnswered: 0, puzzlesCorrect: 0, bestStreak: 0 };

export const useStats = create<Stats & { record: (c: Category, ok: boolean, streak: number) => void; reset: () => void }>(
  (set, get) => ({
    ...loadJSON<Stats>(KEY, EMPTY),
    record: (category, ok, streak) => {
      const s = get();
      const cat = s.byCategory[category] ?? { answered: 0, correct: 0 };
      const next: Stats = {
        byCategory: { ...s.byCategory, [category]: { answered: cat.answered + 1, correct: cat.correct + (ok ? 1 : 0) } },
        puzzlesAnswered: s.puzzlesAnswered + 1,
        puzzlesCorrect: s.puzzlesCorrect + (ok ? 1 : 0),
        bestStreak: Math.max(s.bestStreak, streak),
      };
      set(next);
      saveJSON(KEY, next);
    },
    reset: () => {
      set(EMPTY);
      saveJSON(KEY, EMPTY);
    },
  }),
);
