export type Category =
  | 'nature'
  | 'language'
  | 'food'
  | 'science'
  | 'history'
  | 'space'
  | 'culture'
  | 'tech'
  | 'body'
  | 'geography'
  | 'brain'
  | 'random';

export type Fact = {
  id: string;
  category: Category;
  text: string;
  /** "When to use this" – the moment this fact is perfect for. */
  useIt?: string;
  /** English Wikipedia article title (with underscores), or a full URL. */
  source: string;
};

export type Country = {
  name: string;
  iso2: string;
  population: number;
  /** km² */
  area: number;
  capital?: string | null;
  lat?: number | null;
  lon?: number | null;
};

type Base<K extends string> = {
  kind: K;
  key: string;
  category: Category;
  /** Which game this is (for per-game levels); set by the feed engine for puzzles. */
  game?: string;
  /** The player's level in this game when the card was made. */
  level?: number;
  /** Part of today's daily challenge (doesn't change levels). */
  daily?: boolean;
  /** A spaced-repetition quiz about this fact id. */
  reviewOf?: string;
};

export type FactCardData = Base<'fact'> & { fact: Fact; label: string };

export type ShownItem = { name: string; emoji: string; display: string; value: number };

export type HigherLowerCardData = Base<'higherLower'> & {
  setId: string;
  question: string;
  options: [ShownItem, ShownItem];
  answer: 0 | 1;
  reveal: string;
};

export type SizeItCardData = Base<'sizeIt'> & {
  setId: string;
  reference: ShownItem;
  target: ShownItem;
  sizeWord: string;
};

export type EstimateCardData = Base<'estimate'> & {
  setId: string;
  question: string;
  emoji: string;
  answer: number;
  answerDisplay: string;
  min: number;
  max: number;
  log: boolean;
  isYear: boolean;
};

export type OrderItCardData = Base<'orderIt'> & {
  setId: string;
  prompt: string;
  items: ShownItem[];
  /** item indices in the correct order */
  correct: number[];
};

export type ChoiceCardData = Base<'choice'> & {
  label: string;
  prompt: string;
  /** big visual above the question, e.g. a flag */
  hero?: string;
  options: string[];
  answer: number;
  explanation?: string;
};

export type QuickMathCardData = Base<'quickMath'> & { seed: number; difficulty: number };

export type AnagramCardData = Base<'anagram'> & { word: string; letters: string[] };

export type RealFakeCardData = Base<'realFake'> & {
  statement: string;
  isReal: boolean;
  original: string;
  source: string;
};

export type WordGuessCardData = Base<'wordGuess'> & { answer: string };

export type OrderMemoryCardData = Base<'orderMemory'> & { cols: number; rows: number; cells: number[] };
export type PatternCardData = Base<'pattern'> & { size: number; cells: number[] };
export type StroopCardData = Base<'stroop'> & { seed: number };
export type RotationCardData = Base<'rotation'> & { a: [number, number][]; b: [number, number][]; mirrored: boolean };
export type SudokuCardData = Base<'sudoku'> & { puzzle: number[]; solution: number[] };
export type GroupSortCardData = Base<'groupSort'> & { groups: { label: string; words: string[] }[]; tiles: string[] };
export type CountryHuntCardData = Base<'countryHunt'> & { iso2: string };
export type WordHiveCardData = Base<'wordHive'> & { center: string; letters: string; words: string[] };
export type CodeBreakerCardData = Base<'codeBreaker'> & {
  code: number[];
  colors: number;
  /** easy = a hint under every peg; classic = only counts */
  mode: 'easy' | 'classic';
};
export type NonogramCardData = Base<'nonogram'> & { size: number; cells: boolean[]; rows: number[][]; cols: number[][] };

export type BreakCardData = Base<'break'> & { minutes: number };

export type CardData =
  | FactCardData
  | HigherLowerCardData
  | SizeItCardData
  | EstimateCardData
  | OrderItCardData
  | ChoiceCardData
  | QuickMathCardData
  | AnagramCardData
  | RealFakeCardData
  | WordGuessCardData
  | OrderMemoryCardData
  | PatternCardData
  | StroopCardData
  | RotationCardData
  | SudokuCardData
  | GroupSortCardData
  | CountryHuntCardData
  | WordHiveCardData
  | CodeBreakerCardData
  | NonogramCardData
  | BreakCardData;

export type CardKind = CardData['kind'];
