import type {
  EstimateCardData,
  HigherLowerCardData,
  OrderItCardData,
  ShownItem,
  SizeItCardData,
} from '../cards/types.ts';
import {
  type QuantityItem,
  type QuantitySet,
  differenceText,
  separation,
  separationWindow,
} from '../data/quantitySets.ts';
import { type Rng, pick, randInt, shuffle } from '../lib/rng.ts';

const shown = (set: QuantitySet, i: QuantityItem): ShownItem => ({
  name: i.name,
  emoji: i.emoji,
  display: set.format(i.value),
  value: i.value,
});

/** Picks a set, preferring ones not used recently. */
export function pickSet(
  rng: Rng,
  sets: readonly QuantitySet[],
  recent: readonly string[],
  filter: (s: QuantitySet) => boolean = () => true,
): QuantitySet {
  const usable = sets.filter((s) => filter(s) && s.items.length >= 6);
  const fresh = usable.filter((s) => !recent.includes(s.id));
  const pool = fresh.length ? fresh : usable;
  // Weighted pick (some sets, like rivers, should show up less often).
  const total = pool.reduce((t, s) => t + (s.weight ?? 1), 0);
  let r = rng() * total;
  for (const s of pool) {
    r -= s.weight ?? 1;
    if (r <= 0) return s;
  }
  return pool[pool.length - 1];
}

/** Two different items whose separation falls in [lo, hi). Falls back to the best effort. */
function pickPair(rng: Rng, set: QuantitySet, lo: number, hi: number): [QuantityItem, QuantityItem] {
  let best: [QuantityItem, QuantityItem] | null = null;
  for (let attempt = 0; attempt < 300; attempt++) {
    const a = set.items[randInt(rng, set.items.length)];
    const b = set.items[randInt(rng, set.items.length)];
    if (a.name === b.name || a.value === b.value) continue;
    const s = separation(set, a.value, b.value);
    if (s >= lo && s < hi) return [a, b];
    if (!best) best = [a, b];
  }
  return best ?? [set.items[0], set.items[1]];
}

export function generateHigherLower(
  set: QuantitySet,
  rng: Rng,
  difficulty: number,
  key: string,
): HigherLowerCardData {
  const [lo, hi] = separationWindow(set, difficulty);
  const [a, b] = pickPair(rng, set, lo, hi);
  const aWins = set.lowerWins ? a.value < b.value : a.value > b.value;
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;
  const diff = set.lowerWins
    ? differenceText(set, loser.value, winner.value)
    : differenceText(set, winner.value, loser.value);
  return {
    kind: 'higherLower',
    key,
    category: set.category,
    setId: set.id,
    question: set.question,
    options: [shown(set, a), shown(set, b)],
    answer: aWins ? 0 : 1,
    reveal: `${winner.name} ${set.verb} ${diff} than ${loser.name}.`,
  };
}

/** Size it: reference bar is fixed, you slide the target to the right size (ratio 1/4 … 4). */
export function generateSizeIt(set: QuantitySet, rng: Rng, difficulty: number, key: string): SizeItCardData {
  // Harder = ratio further from "obvious" doublings; the window keeps it drawable.
  const lo = difficulty < 0.5 ? 1.3 : 1.15;
  const [a, b] = pickPair(rng, set, lo, 4);
  const [reference, target] = rng() < 0.5 ? [a, b] : [b, a];
  return {
    kind: 'sizeIt',
    key,
    category: set.category,
    setId: set.id,
    reference: shown(set, reference),
    target: shown(set, target),
    sizeWord: set.sizeWord ?? 'big',
  };
}

export function generateEstimate(set: QuantitySet, rng: Rng, key: string): EstimateCardData {
  const item = pick(rng, set.items);
  const values = set.items.map((i) => i.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (set.isYear) {
    min = Math.floor((min - 20) / 10) * 10;
    max = Math.min(2030, Math.ceil((max + 10) / 10) * 10);
  } else {
    min = min / 2;
    max = max * 2;
  }
  return {
    kind: 'estimate',
    key,
    category: set.category,
    setId: set.id,
    question: (set.estimate ?? 'How much is {name}?').replace('{name}', item.name),
    emoji: item.emoji,
    answer: item.value,
    answerDisplay: set.format(item.value),
    min,
    max,
    log: !set.isYear,
    isYear: !!set.isYear,
  };
}

/** Score 0–3 for an estimate: how close was the guess? */
export function estimateScore(isYear: boolean, guess: number, answer: number): number {
  if (isYear) {
    const d = Math.abs(guess - answer);
    return d <= 3 ? 3 : d <= 10 ? 2 : d <= 30 ? 1 : 0;
  }
  const r = Math.max(guess, answer) / Math.max(1e-9, Math.min(guess, answer));
  return r <= 1.15 ? 3 : r <= 1.5 ? 2 : r <= 2.5 ? 1 : 0;
}

export function generateOrderIt(set: QuantitySet, rng: Rng, difficulty: number, key: string): OrderItCardData {
  const [minSep] = separationWindow(set, Math.min(difficulty, 0.6));
  const needed = set.isYear ? Math.max(3, minSep / 2) : Math.max(1.2, Math.sqrt(minSep));
  let chosen: QuantityItem[] = [];
  for (let attempt = 0; attempt < 400 && chosen.length < 4; attempt++) {
    const c = set.items[randInt(rng, set.items.length)];
    if (chosen.every((x) => x.name !== c.name && separation(set, x.value, c.value) >= needed)) chosen.push(c);
  }
  if (chosen.length < 4) chosen = shuffle(rng, set.items).slice(0, 4);
  const items = shuffle(rng, chosen).map((i) => shown(set, i));
  const correct = items
    .map((_, i) => i)
    .sort((x, y) => (set.lowerWins ? items[x].value - items[y].value : items[y].value - items[x].value));
  return {
    kind: 'orderIt',
    key,
    category: set.category,
    setId: set.id,
    prompt: set.orderPrompt,
    items,
    correct,
  };
}
