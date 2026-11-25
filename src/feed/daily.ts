import type { CardData } from '../cards/types';
import { makePuzzleCard, type PuzzleKind } from './puzzleFactory';
import { createRng, pick } from '../lib/rng';

// One slot per type of thinking, so every daily challenge is a nice mix.
const SLOTS: PuzzleKind[][] = [
  ['wordGuess', 'anagram'],
  ['sizeIt', 'higherLower', 'estimate', 'orderIt'],
  ['rotation', 'pattern', 'orderMemory', 'oddOneOut', 'sequence'],
  ['nonogram', 'sudoku', 'codeBreaker'],
  ['countryHunt', 'countryQuiz'],
];
const DAILY_LEVEL = 3; // same difficulty for everyone

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Today's 5 puzzles. The date is the seed, so everyone gets the same ones. */
export function makeDailyCards(date: string): CardData[] {
  const rng = createRng(hash('brainscroll-daily-' + date));
  return SLOTS.map((slot, i) => {
    const kind = pick(rng, slot);
    const card = makePuzzleCard(kind, rng, DAILY_LEVEL, `daily-${date}-${i}`)!;
    card.daily = true;
    return card;
  });
}
