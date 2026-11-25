import { loadJSON, saveJSON } from './persist';

// Per-game levels and other small counters, saved on this device.
export const MAX_LEVEL = 10;
const KEY = 'progress.v2';

type Data = { levels: Record<string, number>; counts: Record<string, number> };
let data = loadJSON<Data>(KEY, { levels: {}, counts: {} });

export function getCount(name: string): number {
  return data.counts[name] ?? 0;
}

export function increment(name: string): number {
  data.counts[name] = getCount(name) + 1;
  saveJSON(KEY, data);
  return data.counts[name];
}

/** Level of one game, 0 … MAX_LEVEL (shown to the player as 1 … 11). */
export function getLevel(game: string): number {
  return Math.min(MAX_LEVEL, data.levels[game] ?? 0);
}

/** Win → one level up, loss → one level down. */
export function recordGameResult(game: string, ok: boolean) {
  const lvl = getLevel(game);
  data.levels[game] = ok ? Math.min(MAX_LEVEL, lvl + 1) : Math.max(0, lvl - 1);
  saveJSON(KEY, data);
}

export function resetLevels() {
  data = { levels: {}, counts: data.counts };
  saveJSON(KEY, data);
}

/** 0 (easy) … 1 (hard) for generators that take a difficulty. */
export function levelToDifficulty(level: number): number {
  return Math.min(1, level / 7);
}
