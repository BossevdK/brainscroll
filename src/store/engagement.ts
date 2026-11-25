import { loadJSON, saveJSON } from './persist';

/**
 * What you like, learned on this device only. Per game type and per category we count:
 * shown, finished (answered), long looks (you stayed a while) and saves.
 * From that comes a weight 0.5 … 2 that the feed uses to show more of what you enjoy.
 */
type Stat = { shown: number; done: number; long: number; saves: number };
type Data = { kinds: Record<string, Stat>; cats: Record<string, Stat> };

const KEY = 'engagement.v1';
let data: Data = loadJSON<Data>(KEY, { kinds: {}, cats: {} });

const get = (map: Record<string, Stat>, k: string): Stat => (map[k] ??= { shown: 0, done: 0, long: 0, saves: 0 });

function touch(kind: string | undefined, cat: string | undefined, f: (s: Stat) => void) {
  if (kind) f(get(data.kinds, kind));
  if (cat) f(get(data.cats, cat));
  saveJSON(KEY, data);
}

export const engagement = {
  shown: (kind?: string, cat?: string) => touch(kind, cat, (s) => s.shown++),
  done: (kind?: string, cat?: string) => touch(kind, cat, (s) => s.done++),
  long: (kind?: string, cat?: string) => touch(kind, cat, (s) => s.long++),
  saved: (kind?: string, cat?: string) => touch(kind, cat, (s) => s.saves++),
};

function multiplier(s: Stat | undefined): number {
  if (!s) return 1;
  // Smoothed "how much do you engage when you see this" (starts neutral at 0.5).
  const affinity = (s.done + 0.5 * s.long + 2 * s.saves + 1) / (s.shown + 2);
  return 0.5 + 1.5 * Math.min(1, Math.max(0, affinity));
}

export const kindWeight = (kind: string) => multiplier(data.kinds[kind]);
export const categoryWeight = (cat: string) => multiplier(data.cats[cat]);
export const timesShown = (kind: string) => data.kinds[kind]?.shown ?? 0;

export function resetEngagement() {
  data = { kinds: {}, cats: {} };
  saveJSON(KEY, data);
}
