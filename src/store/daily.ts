import { create } from 'zustand';
import { loadJSON, saveJSON } from './persist';

export const DAILY_COUNT = 5;

/** Local date as YYYY-MM-DD (the daily challenge changes at your midnight). */
export function todayString(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayString(d);
}

type Daily = {
  date: string; // which day `results` belongs to
  results: Record<string, boolean>; // card key → right/wrong
  streak: number; // days in a row with the challenge finished
  best: number;
  lastCompleted: string;
};

const KEY = 'daily.v1';
const EMPTY: Daily = { date: '', results: {}, streak: 0, best: 0, lastCompleted: '' };

function fresh(d: Daily): Daily {
  const today = todayString();
  let next = d.date === today ? d : { ...d, date: today, results: {} };
  // Missed a day: the streak is broken.
  if (next.lastCompleted && next.lastCompleted !== today && next.lastCompleted !== yesterdayString()) {
    next = { ...next, streak: 0 };
  }
  return next;
}

export const useDaily = create<Daily & { record: (key: string, ok: boolean) => void; refresh: () => void }>((set, get) => ({
  ...fresh(loadJSON<Daily>(KEY, EMPTY)),
  refresh: () => set(fresh(get())),
  record: (key, ok) => {
    const s = fresh(get());
    if (key in s.results) return; // first answer counts
    const results = { ...s.results, [key]: ok };
    let { streak, best, lastCompleted } = s;
    if (Object.keys(results).length === DAILY_COUNT && lastCompleted !== s.date) {
      streak = lastCompleted === yesterdayString() ? streak + 1 : 1;
      best = Math.max(best, streak);
      lastCompleted = s.date;
    }
    const next = { date: s.date, results, streak, best, lastCompleted };
    set(next);
    saveJSON(KEY, next);
  },
}));
