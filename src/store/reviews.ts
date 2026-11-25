import { loadJSON, saveJSON } from './persist';

/**
 * Spaced repetition: facts you looked at (or saved) come back later as a quick quiz.
 * Right answer → wait longer next time (1 → 3 → 7 → 16 → 35 days, then "learned").
 * Wrong answer → back to tomorrow.
 */
const DAY = 24 * 60 * 60 * 1000;
const INTERVALS = [1, 3, 7, 16, 35];
const KEY = 'reviews.v1';

type Entry = { due: number; stage: number };
type Data = { items: Record<string, Entry>; learned: number };

let data = loadJSON<Data>(KEY, { items: {}, learned: 0 });

export function scheduleReview(factId: string) {
  if (data.items[factId]) return;
  data.items[factId] = { due: Date.now() + INTERVALS[0] * DAY, stage: 0 };
  saveJSON(KEY, data);
}

export function dueReviews(limit: number, exclude: Set<string>): string[] {
  const now = Date.now();
  return Object.entries(data.items)
    .filter(([id, e]) => e.due <= now && !exclude.has(id))
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, limit)
    .map(([id]) => id);
}

export function recordReview(factId: string, ok: boolean) {
  const e = data.items[factId];
  if (!e) return;
  if (ok) {
    const stage = e.stage + 1;
    if (stage >= INTERVALS.length) {
      delete data.items[factId];
      data.learned++;
    } else data.items[factId] = { stage, due: Date.now() + INTERVALS[stage] * DAY };
  } else data.items[factId] = { stage: 0, due: Date.now() + DAY };
  saveJSON(KEY, data);
}

/** Facts you can't drop as a review (e.g. no good question possible). */
export function dropReview(factId: string) {
  delete data.items[factId];
  saveJSON(KEY, data);
}

export function reviewCounts() {
  const now = Date.now();
  const all = Object.values(data.items);
  return { scheduled: all.length, due: all.filter((e) => e.due <= now).length, learned: data.learned };
}
