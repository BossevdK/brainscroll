import type { CardData, Fact } from '../cards/types';
import { COUNTRIES, CURATED_FACTS, DYK_FACTS, SETS, WORD_ANSWERS, WORD_GROUPS, WORD_HIVES } from '../data';
import type { QuantitySet } from '../data/quantitySets';
import {
  generateEstimate,
  generateHigherLower,
  generateOrderIt,
  generateSizeIt,
  pickSet,
} from '../puzzles/quantity';
import {
  generateAnagram,
  generateCountryQuiz,
  generateRealFake,
  generateSequence,
  generateWordGuess,
} from '../puzzles/brain';
import {
  makeCode,
  makeGroupSort,
  makeNonogram,
  makeOddOneOut,
  makeOrderMemory,
  makePattern,
  makeRotation,
  makeSudoku,
} from '../puzzles/mind';
import { takeTrivia } from '../sources/live';
import { getCount, levelToDifficulty } from '../store/progress';
import { type Rng, randInt } from '../lib/rng';

export type PuzzleKind =
  | 'higherLower'
  | 'sizeIt'
  | 'estimate'
  | 'orderIt'
  | 'countryQuiz'
  | 'sequence'
  | 'anagram'
  | 'wordGuess'
  | 'quickMath'
  | 'realFake'
  | 'trivia'
  | 'orderMemory'
  | 'pattern'
  | 'stroop'
  | 'rotation'
  | 'sudoku'
  | 'oddOneOut'
  | 'groupSort'
  | 'countryHunt'
  | 'wordHive'
  | 'codeBreaker'
  | 'nonogram';

/** Base frequency of each game (before the smart mix adjusts it to your taste). */
export const BASE_WEIGHTS: Record<PuzzleKind, number> = {
  // knowledge & comparisons
  higherLower: 2,
  sizeIt: 1.8,
  estimate: 1.4,
  orderIt: 1.4,
  countryQuiz: 1,
  realFake: 1.2,
  trivia: 1.8,
  // brain training
  sequence: 1,
  quickMath: 0.8,
  orderMemory: 1.2,
  pattern: 1.2,
  stroop: 1,
  rotation: 1.2,
  sudoku: 1,
  oddOneOut: 1.4,
  // daily-style word & logic games
  anagram: 1,
  wordGuess: 1.2,
  groupSort: 1,
  countryHunt: 1,
  wordHive: 0.8,
  codeBreaker: 1,
  nonogram: 0.9,
};

export const GAME_NAMES: Record<PuzzleKind, string> = {
  higherLower: 'Higher or lower',
  sizeIt: 'Size it',
  estimate: 'Estimate',
  orderIt: 'Order it',
  countryQuiz: 'Flags & capitals',
  realFake: 'Real or fake?',
  trivia: 'Trivia',
  sequence: 'Next in line',
  quickMath: 'Quick math',
  orderMemory: 'Order memory',
  pattern: 'Pattern memory',
  stroop: 'Color clash',
  rotation: 'Same or mirrored?',
  sudoku: 'Mini sudoku',
  oddOneOut: 'Odd one out',
  anagram: 'Anagram',
  wordGuess: 'Word guess',
  groupSort: 'Group sort',
  countryHunt: 'Country hunt',
  wordHive: 'Word hive',
  codeBreaker: 'Code breaker',
  nonogram: 'Mini nonogram',
};

export const ALL_FACTS: Fact[] = [...CURATED_FACTS, ...DYK_FACTS];

/**
 * Builds one puzzle card. `recentSets` (optional) is updated so the same data set
 * (e.g. mountains) doesn't come back too soon.
 */
export function makePuzzleCard(
  kind: PuzzleKind,
  rng: Rng,
  level: number,
  key: string,
  recentSets: string[] = [],
): CardData | null {
  const difficulty = levelToDifficulty(level);
  const useSet = (filter?: (s: QuantitySet) => boolean) => {
    const set = pickSet(rng, SETS, recentSets, filter);
    recentSets.unshift(set.id);
    recentSets.length = Math.min(recentSets.length, 5);
    return set;
  };
  let card: CardData | null;
  switch (kind) {
    case 'higherLower':
      card = generateHigherLower(useSet(), rng, difficulty, key);
      break;
    case 'sizeIt':
      card = generateSizeIt(useSet((s) => !!s.sizeable), rng, difficulty, key);
      break;
    case 'estimate':
      card = generateEstimate(useSet((s) => !!s.estimate), rng, key);
      break;
    case 'orderIt':
      card = generateOrderIt(useSet(), rng, difficulty, key);
      break;
    case 'countryQuiz':
      card = generateCountryQuiz(COUNTRIES, rng, difficulty, key);
      break;
    case 'sequence':
      card = generateSequence(rng, difficulty, key);
      break;
    case 'anagram':
      card = generateAnagram(WORD_ANSWERS, rng, key);
      break;
    case 'wordGuess':
      card = generateWordGuess(WORD_ANSWERS, rng, key);
      break;
    case 'quickMath':
      card = { kind: 'quickMath', key, category: 'brain', seed: randInt(rng, 1e9), difficulty };
      break;
    case 'realFake':
      card = generateRealFake(ALL_FACTS, rng, key);
      break;
    case 'orderMemory':
      card = { kind: 'orderMemory', key, category: 'brain', ...makeOrderMemory(rng, level) };
      break;
    case 'pattern':
      card = { kind: 'pattern', key, category: 'brain', ...makePattern(rng, level) };
      break;
    case 'stroop':
      card = { kind: 'stroop', key, category: 'brain', seed: randInt(rng, 1e9) };
      break;
    case 'rotation':
      card = { kind: 'rotation', key, category: 'brain', ...makeRotation(rng, level) };
      break;
    case 'sudoku':
      card = { kind: 'sudoku', key, category: 'brain', ...makeSudoku(rng, level) };
      break;
    case 'oddOneOut':
      card = makeOddOneOut(WORD_GROUPS, rng, key);
      break;
    case 'groupSort':
      card = { kind: 'groupSort', key, category: 'language', ...makeGroupSort(WORD_GROUPS, rng) };
      break;
    case 'countryHunt': {
      // Mostly countries people have heard of; more obscure ones at higher levels.
      const pool = COUNTRIES.slice(0, Math.round(60 + difficulty * 100)).filter((c) => c.lat != null);
      card = { kind: 'countryHunt', key, category: 'geography', iso2: pool[randInt(rng, pool.length)].iso2 };
      break;
    }
    case 'wordHive':
      card = { kind: 'wordHive', key, category: 'language', ...WORD_HIVES[randInt(rng, WORD_HIVES.length)] };
      break;
    case 'codeBreaker':
      // Hints per peg until you've cracked 3 codes, then the classic version.
      card = {
        kind: 'codeBreaker',
        key,
        category: 'brain',
        ...makeCode(rng, level),
        mode: getCount('codeBreakerWins') >= 3 ? 'classic' : 'easy',
      };
      break;
    case 'nonogram':
      card = { kind: 'nonogram', key, category: 'brain', ...makeNonogram(rng, level) };
      break;
    case 'trivia': {
      const t = takeTrivia();
      card = t
        ? { kind: 'choice', key, category: t.category, label: 'Trivia', prompt: t.question, options: t.options, answer: t.answer }
        : null;
      break;
    }
  }
  if (card) {
    card.game = kind;
    card.level = level;
  }
  return card;
}
