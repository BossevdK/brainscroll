// Spaced-repetition quiz about a fact you've seen before.
import type { CardData, Fact } from '../cards/types.ts';
import { fakeify } from './brain.ts';
import { type Rng, shuffle } from '../lib/rng.ts';

/** "Wombat" from "Wombat", "Eiffel Tower" from "Eiffel_Tower", drops "(disambiguation)". */
export function titleOf(f: Fact): string | null {
  if (/^https?:/.test(f.source)) return null;
  return decodeURIComponent(f.source).replace(/_/g, ' ').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Prefers a fill-in-the-blank: the fact with its subject blanked out and 4 subjects to
 * choose from. Falls back to "real or fake" (a number changed) when that's not possible.
 */
export function makeReviewCard(fact: Fact, others: readonly Fact[], rng: Rng, key: string): CardData | null {
  const title = titleOf(fact);
  if (title && title.length >= 3) {
    const re = new RegExp(`\\b${escapeRe(title)}\\w*`, 'i');
    const m = re.exec(fact.text);
    if (m) {
      const blanked = fact.text.replace(m[0], '_____');
      const pool = shuffle(
        rng,
        others.filter((o) => o.id !== fact.id && o.category === fact.category),
      )
        .map(titleOf)
        .filter((t): t is string => !!t && t.length >= 3 && t.length <= 40 && t.toLowerCase() !== title.toLowerCase());
      const distractors = [...new Set(pool)].slice(0, 3);
      if (distractors.length === 3) {
        const options = shuffle(rng, [title, ...distractors]);
        return {
          kind: 'choice',
          key,
          category: fact.category,
          label: 'Remember this?',
          prompt: blanked,
          options,
          answer: options.indexOf(title),
          explanation: fact.text,
          reviewOf: fact.id,
        };
      }
    }
  }
  const real = rng() < 0.5;
  const statement = real ? fact.text : fakeify(fact.text, rng);
  if (!statement) return null;
  return {
    kind: 'realFake',
    key,
    category: fact.category,
    statement,
    isReal: real,
    original: fact.text,
    source: fact.source,
    reviewOf: fact.id,
  };
}
