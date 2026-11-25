import { create } from 'zustand';
import type { Category } from '../cards/types';
import { loadJSON, saveJSON } from './persist';

type Settings = {
  disabledCategories: Category[];
  breakReminder: boolean;
  breakMinutes: number;
};

const KEY = 'settings.v1';
const DEFAULTS: Settings = { disabledCategories: [], breakReminder: true, breakMinutes: 20 };

export const useSettings = create<
  Settings & {
    toggleCategory: (c: Category) => void;
    setBreakReminder: (on: boolean) => void;
    setBreakMinutes: (m: number) => void;
  }
>((set, get) => {
  const save = () => {
    const { disabledCategories, breakReminder, breakMinutes } = get();
    saveJSON(KEY, { disabledCategories, breakReminder, breakMinutes });
  };
  return {
    ...loadJSON<Settings>(KEY, DEFAULTS),
    toggleCategory: (c) => {
      const d = get().disabledCategories;
      set({ disabledCategories: d.includes(c) ? d.filter((x) => x !== c) : [...d, c] });
      save();
    },
    setBreakReminder: (on) => {
      set({ breakReminder: on });
      save();
    },
    setBreakMinutes: (m) => {
      set({ breakMinutes: m });
      save();
    },
  };
});

export const isCategoryEnabled = (c: Category) => !useSettings.getState().disabledCategories.includes(c);
