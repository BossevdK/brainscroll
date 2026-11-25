import type { Category, Country } from '../cards/types.ts';
import { flagEmoji, compactNumber } from '../lib/format.ts';

export type QuantityItem = { name: string; value: number; emoji: string };

export type QuantitySet = {
  id: string;
  category: Category;
  items: QuantityItem[];
  /** Higher-or-lower question. */
  question: string;
  /** For years: the earlier one "wins" (Which came first?). */
  lowerWins: boolean;
  /** "{w} is 2× taller than {l}" → verb "is", comparative "taller". */
  verb: 'is' | 'has';
  comparative: string;
  format: (v: number) => string;
  /** Estimate question template, "{name}" is replaced. Omit to skip this set for Estimate. */
  estimate?: string;
  /** Unit label next to the slider value. */
  unit?: string;
  /** Can be drawn as bars side by side (Size it). */
  sizeable?: boolean;
  /** Word for "Size it": "tall", "long", "wide". */
  sizeWord?: string;
  /** Order it instruction. */
  orderPrompt: string;
  isYear?: boolean;
  /** Relative chance of being picked (default 1). */
  weight?: number;
};

type Raw = {
  countries: Country[];
  mountains: { name: string; value: number }[];
  structures: { name: string; value: number }[];
  cities: { name: string; value: number }[];
  rivers: { name: string; value: number }[];
  companies: { name: string; value: number }[];
  films: { name: string; value: number }[];
  games: { name: string; value: number }[];
  curated: Record<
    'animalWeight' | 'animalSpeed' | 'animalLength' | 'inventions' | 'foodCalories' | 'spaceDiameter' | 'spaceDistance',
    QuantityItem[]
  >;
};

const withEmoji = (items: { name: string; value: number }[], emoji: string): QuantityItem[] =>
  items.map((i) => ({ name: i.name, value: i.value, emoji }));

const num = (unit: string) => (v: number) => `${compactNumber(v)}${unit}`;
const kg = (v: number) => (v < 1 ? `${compactNumber(v * 1000)} g` : v >= 1000 ? `${compactNumber(v / 1000)} tonnes` : `${compactNumber(v)} kg`);
const metres = (v: number) => (v < 1 ? `${Math.round(v * 100)} cm` : `${compactNumber(v)} m`);
const yearFmt = (v: number) => (v < 0 ? `${-v} BC` : `${v}`);

export function buildQuantitySets(raw: Raw): QuantitySet[] {
  const countryItems = (f: (c: Country) => number) =>
    raw.countries.map((c) => ({ name: c.name, value: f(c), emoji: flagEmoji(c.iso2) }));
  // Country sets are capped to the ~120 most populous: more fun with countries people know.
  const sets: QuantitySet[] = [
    {
      id: 'countryPopulation', category: 'geography', items: countryItems((c) => c.population).slice(0, 120),
      question: 'Which country has more people?', lowerWins: false, verb: 'has', comparative: 'more people',
      format: num(' people'), estimate: 'How many people live in {name}?', unit: 'people', orderPrompt: 'Most people first',
    },
    {
      id: 'countryArea', category: 'geography', items: countryItems((c) => c.area).slice(0, 140),
      question: 'Which country is bigger?', lowerWins: false, verb: 'is', comparative: 'bigger',
      format: num(' km²'), estimate: 'How big is {name}? (km²)', unit: 'km²', orderPrompt: 'Biggest first',
    },
    {
      id: 'countryDensity', category: 'geography', items: countryItems((c) => c.population / c.area).slice(0, 120),
      question: 'Which country is more crowded?', lowerWins: false, verb: 'is', comparative: 'more crowded',
      format: num(' people per km²'), orderPrompt: 'Most crowded first',
    },
    {
      id: 'mountains', category: 'geography', items: withEmoji(raw.mountains, '⛰️'),
      question: 'Which mountain is higher?', lowerWins: false, verb: 'is', comparative: 'higher',
      format: metres, estimate: 'How high is {name}?', unit: 'm', sizeable: true, sizeWord: 'high', orderPrompt: 'Highest first',
    },
    {
      id: 'structures', category: 'culture', items: withEmoji(raw.structures, '🏛️'),
      question: 'Which one is taller?', lowerWins: false, verb: 'is', comparative: 'taller',
      format: metres, estimate: 'How tall is {name}?', unit: 'm', sizeable: true, sizeWord: 'tall', orderPrompt: 'Tallest first',
    },
    {
      id: 'cities', category: 'geography', items: withEmoji(raw.cities, '🏙️'),
      question: 'Which city has more inhabitants?', lowerWins: false, verb: 'has', comparative: 'more inhabitants',
      format: num(' people'), estimate: 'How many people live in {name}?', unit: 'people', orderPrompt: 'Most inhabitants first',
    },
    {
      id: 'rivers', category: 'geography', items: withEmoji(raw.rivers, '🌊'),
      question: 'Which river is longer?', lowerWins: false, verb: 'is', comparative: 'longer',
      format: num(' km'), estimate: 'How long is the {name}? (km)', unit: 'km', sizeable: true, sizeWord: 'long', orderPrompt: 'Longest first',
      weight: 0.25, // not too much water
    },
    {
      id: 'companies', category: 'tech', items: withEmoji(raw.companies, '🏢'),
      question: 'Which company is older?', lowerWins: true, verb: 'is', comparative: 'older',
      format: yearFmt, estimate: 'In what year was {name} founded?', isYear: true, orderPrompt: 'Oldest first',
    },
    {
      id: 'films', category: 'culture', items: withEmoji(raw.films, '🎬'),
      question: 'Which film came out first?', lowerWins: true, verb: 'is', comparative: 'older',
      format: yearFmt, estimate: 'In what year did {name} come out?', isYear: true, orderPrompt: 'Oldest first',
    },
    {
      id: 'games', category: 'tech', items: withEmoji(raw.games, '🎮'),
      question: 'Which game came out first?', lowerWins: true, verb: 'is', comparative: 'older',
      format: yearFmt, estimate: 'In what year did {name} come out?', isYear: true, orderPrompt: 'Oldest first',
    },
    {
      id: 'animalWeight', category: 'nature', items: raw.curated.animalWeight,
      question: 'Which animal is heavier?', lowerWins: false, verb: 'is', comparative: 'heavier',
      format: kg, estimate: 'How much does a {name} weigh? (kg)', unit: 'kg', orderPrompt: 'Heaviest first',
    },
    {
      id: 'animalSpeed', category: 'nature', items: raw.curated.animalSpeed,
      question: 'Which one is faster?', lowerWins: false, verb: 'is', comparative: 'faster',
      format: num(' km/h'), estimate: 'How fast can a {name} go? (km/h)', unit: 'km/h', orderPrompt: 'Fastest first',
    },
    {
      id: 'animalLength', category: 'nature', items: raw.curated.animalLength,
      question: 'Which one is bigger?', lowerWins: false, verb: 'is', comparative: 'bigger',
      format: metres, sizeable: true, sizeWord: 'big', orderPrompt: 'Biggest first',
    },
    {
      id: 'inventions', category: 'history', items: raw.curated.inventions,
      question: 'Which came first?', lowerWins: true, verb: 'is', comparative: 'older',
      format: yearFmt, estimate: 'In what year: {name}?', isYear: true, orderPrompt: 'Oldest first',
    },
    {
      id: 'foodCalories', category: 'food', items: raw.curated.foodCalories,
      question: 'Which has more calories? (per 100 g)', lowerWins: false, verb: 'has', comparative: 'more calories',
      format: num(' kcal'), estimate: 'How many calories in 100 g of {name}?', unit: 'kcal', orderPrompt: 'Most calories first',
    },
    {
      id: 'spaceDiameter', category: 'space', items: raw.curated.spaceDiameter,
      question: 'Which one is bigger?', lowerWins: false, verb: 'is', comparative: 'bigger',
      format: num(' km wide'), sizeable: true, sizeWord: 'wide', orderPrompt: 'Biggest first',
    },
    {
      id: 'spaceDistance', category: 'space', items: raw.curated.spaceDistance,
      question: 'Which is further from the Sun?', lowerWins: false, verb: 'is', comparative: 'further away',
      format: (v) => `${compactNumber(v)} million km`, orderPrompt: 'Furthest from the Sun first',
    },
  ];
  return sets.map((s) => ({ ...s, items: s.items.filter((i) => Number.isFinite(i.value) && i.value > -10000) }));
}

/** How "far apart" two values are, used for difficulty and fairness. */
export function separation(set: QuantitySet, a: number, b: number): number {
  if (set.isYear) return Math.abs(a - b);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo <= 0 ? Infinity : hi / lo;
}

/** Window of allowed separation by difficulty (0 easy … 1 hard). */
export function separationWindow(set: QuantitySet, difficulty: number): [number, number] {
  if (set.isYear) {
    if (difficulty < 0.34) return [40, Infinity];
    if (difficulty < 0.67) return [10, 40];
    return [2, 10];
  }
  if (difficulty < 0.34) return [3, Infinity];
  if (difficulty < 0.67) return [1.5, 3];
  return [1.12, 1.5];
}

/** "2.4× taller", "35% bigger", "12 years older" */
export function differenceText(set: QuantitySet, winner: number, loser: number): string {
  if (set.isYear) {
    const d = Math.abs(winner - loser);
    return `${d} year${d === 1 ? '' : 's'} ${set.comparative}`;
  }
  const r = winner / loser;
  if (r < 1.5) return `${Math.round((r - 1) * 100)}% ${set.comparative}`;
  if (r >= 10) return `${Math.round(r).toLocaleString('en-US')}× ${set.comparative}`;
  return `${r.toFixed(1).replace(/\.0$/, '')}× ${set.comparative}`;
}
