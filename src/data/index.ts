import type { Country, Fact } from '../cards/types';
import { buildQuantitySets, type QuantitySet } from './quantitySets';
import countries from './countries.json';
import mountains from './wd-mountains.json';
import structures from './wd-structures.json';
import cities from './wd-cities.json';
import rivers from './wd-rivers.json';
import companies from './wd-companies.json';
import films from './wd-films.json';
import games from './wd-games.json';
import curated from './curated.json';
import curatedFacts from './facts.json';
import dyk from './dyk.json';
import words5 from './words5.json';

export const COUNTRIES = countries as Country[];

export const SETS: QuantitySet[] = buildQuantitySets({
  countries: COUNTRIES,
  mountains,
  structures,
  cities,
  rivers,
  companies,
  films,
  games,
  curated,
});

const setMap = new Map(SETS.map((s) => [s.id, s]));
export const setById = (id: string) => setMap.get(id)!;

/** Hand-picked facts first-class, plus the Wikipedia "Did you know" archive. */
export const CURATED_FACTS = curatedFacts as Fact[];
export const DYK_FACTS = dyk as Fact[];

export const WORD_ANSWERS: string[] = words5.answers;
let validWords: Set<string> | null = null;
export function isValidWord(w: string): boolean {
  if (!validWords) validWords = new Set(words5.valid.split(' '));
  return validWords.has(w);
}

import groups from './groups.json';
import wordhive from './wordhive.json';
import type { WordGroup } from '../puzzles/mind';

export const WORD_GROUPS = groups as WordGroup[];
export const WORD_HIVES = wordhive as { center: string; letters: string; words: string[] }[];
