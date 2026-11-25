// Offline generators for flag/capital quiz, number sequences, anagrams, word guess,
// quick math and "real or fake".
import type {
  AnagramCardData,
  ChoiceCardData,
  Country,
  Fact,
  RealFakeCardData,
  WordGuessCardData,
} from '../cards/types.ts';
import { flagEmoji } from '../lib/format.ts';
import { type Rng, pick, randInt, shuffle } from '../lib/rng.ts';

// ---------------------------------------------------------------- flags & capitals

export function generateCountryQuiz(
  countries: readonly Country[],
  rng: Rng,
  difficulty: number,
  key: string,
): ChoiceCardData {
  // Easy: well-known (populous) countries; harder: the whole world.
  const poolSize = Math.round(50 + difficulty * (countries.length - 50));
  const pool = countries.slice(0, poolSize);
  const mode = rng() < 0.5 ? 'flag' : 'capital';
  const candidates = mode === 'capital' ? pool.filter((c) => c.capital) : pool;
  const answer = pick(rng, candidates);
  const others = shuffle(rng, candidates.filter((c) => c.iso2 !== answer.iso2)).slice(0, 3);
  const opts = shuffle(rng, [answer, ...others]);
  if (mode === 'flag') {
    return {
      kind: 'choice',
      key,
      category: 'geography',
      label: 'Guess the flag',
      prompt: 'Which country does this flag belong to?',
      hero: flagEmoji(answer.iso2),
      options: opts.map((c) => c.name),
      answer: opts.indexOf(answer),
    };
  }
  return {
    kind: 'choice',
    key,
    category: 'geography',
    label: 'Capital cities',
    prompt: `What is the capital of ${answer.name}?`,
    hero: flagEmoji(answer.iso2),
    options: opts.map((c) => c.capital!),
    answer: opts.indexOf(answer),
  };
}

// ---------------------------------------------------------------- number sequences

type Seq = { terms: number[]; rule: string };

function makeSequence(rng: Rng, difficulty: number): Seq {
  const kinds = difficulty < 0.34 ? ['add', 'mul'] : difficulty < 0.67 ? ['add', 'mul', 'square', 'alt', 'growAdd'] : ['square', 'alt', 'growAdd', 'fib', 'mulAdd'];
  const kind = pick(rng, kinds);
  const n = 6;
  const t: number[] = [];
  switch (kind) {
    case 'add': {
      const a = 1 + randInt(rng, 20);
      const d = 2 + randInt(rng, 9);
      for (let i = 0; i < n; i++) t.push(a + i * d);
      return { terms: t, rule: `+${d} each time` };
    }
    case 'mul': {
      const a = 1 + randInt(rng, 4);
      const m = 2 + randInt(rng, 2);
      for (let i = 0; i < n; i++) t.push(a * m ** i);
      return { terms: t, rule: `×${m} each time` };
    }
    case 'square': {
      const s = 1 + randInt(rng, 5);
      for (let i = 0; i < n; i++) t.push((s + i) ** 2);
      return { terms: t, rule: 'square numbers' };
    }
    case 'alt': {
      const a = 5 + randInt(rng, 20);
      const p = 3 + randInt(rng, 6);
      const q = 1 + randInt(rng, p - 1);
      let v = a;
      for (let i = 0; i < n; i++) {
        t.push(v);
        v += i % 2 === 0 ? p : -q;
      }
      return { terms: t, rule: `+${p}, −${q}, repeat` };
    }
    case 'growAdd': {
      let v = 1 + randInt(rng, 10);
      let d = 1 + randInt(rng, 3);
      for (let i = 0; i < n; i++) {
        t.push(v);
        v += d;
        d++;
      }
      return { terms: t, rule: 'the step grows by 1 each time' };
    }
    case 'fib': {
      let a = 1 + randInt(rng, 4);
      let b = a + 1 + randInt(rng, 4);
      for (let i = 0; i < n; i++) {
        t.push(a);
        [a, b] = [b, a + b];
      }
      return { terms: t, rule: 'add the two previous numbers' };
    }
    default: {
      // mulAdd: ×2 then +k
      const k = 1 + randInt(rng, 5);
      let v = 1 + randInt(rng, 5);
      for (let i = 0; i < n; i++) {
        t.push(v);
        v = v * 2 + k;
      }
      return { terms: t, rule: `×2, then +${k}` };
    }
  }
}

export function generateSequence(rng: Rng, difficulty: number, key: string): ChoiceCardData {
  const { terms, rule } = makeSequence(rng, difficulty);
  const answer = terms[terms.length - 1];
  const shownTerms = terms.slice(0, -1);
  const wrong = new Set<number>();
  const deltas = [1, -1, 2, -2, 3, 5, -4, 10, -10];
  for (const d of shuffle(rng, deltas)) {
    if (wrong.size >= 3) break;
    const w = answer + d * Math.max(1, Math.round(Math.abs(answer) * 0.05));
    if (w !== answer && w > 0) wrong.add(w);
  }
  const options = shuffle(rng, [answer, ...wrong]);
  return {
    kind: 'choice',
    key,
    category: 'brain',
    label: 'Next in line',
    prompt: 'What comes next?',
    hero: `${shownTerms.join(', ')}, ?`,
    options: options.map(String),
    answer: options.indexOf(answer),
    explanation: `Rule: ${rule}.`,
  };
}

// ---------------------------------------------------------------- words

export function generateAnagram(answers: readonly string[], rng: Rng, key: string): AnagramCardData {
  const word = pick(rng, answers);
  let letters = shuffle(rng, word.split(''));
  for (let i = 0; i < 5 && letters.join('') === word; i++) letters = shuffle(rng, word.split(''));
  return { kind: 'anagram', key, category: 'language', word, letters };
}

export function generateWordGuess(answers: readonly string[], rng: Rng, key: string): WordGuessCardData {
  return { kind: 'wordGuess', key, category: 'language', answer: pick(rng, answers) };
}

export type LetterScore = 'hit' | 'present' | 'miss';

/** Scores a guess the classic way, handling double letters correctly. */
export function scoreGuess(guess: string, answer: string): LetterScore[] {
  const res: LetterScore[] = Array(guess.length).fill('miss');
  const left: Record<string, number> = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) res[i] = 'hit';
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === 'hit') continue;
    if (left[guess[i]]) {
      res[i] = 'present';
      left[guess[i]]--;
    }
  }
  return res;
}

// ---------------------------------------------------------------- quick math

export type MathQuestion = { text: string; answer: number };

export function makeMathQuestion(rng: Rng, difficulty: number): MathQuestion {
  // Highest levels: half the sums take two steps, e.g. "7 × 8 − 15".
  if (difficulty > 0.7 && rng() < 0.5) {
    const a = 3 + randInt(rng, 10);
    const b = 3 + randInt(rng, 10);
    const c = 2 + randInt(rng, 30);
    return rng() < 0.5 || a * b - c < 0
      ? { text: `${a} × ${b} + ${c}`, answer: a * b + c }
      : { text: `${a} × ${b} − ${c}`, answer: a * b - c };
  }
  const big = difficulty > 0.5;
  const op = pick(rng, big ? ['+', '−', '×', '×', '÷'] : ['+', '−', '×']);
  if (op === '+') {
    const a = 2 + randInt(rng, big ? 90 : 30);
    const b = 2 + randInt(rng, big ? 90 : 30);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (op === '−') {
    const a = 10 + randInt(rng, big ? 90 : 40);
    const b = 1 + randInt(rng, a - 1);
    return { text: `${a} − ${b}`, answer: a - b };
  }
  if (op === '×') {
    const a = 2 + randInt(rng, big ? 11 : 8);
    const b = 2 + randInt(rng, big ? 11 : 8);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  const b = 2 + randInt(rng, 10);
  const q = 2 + randInt(rng, 10);
  return { text: `${b * q} ÷ ${b}`, answer: q };
}

// ---------------------------------------------------------------- real or fake

const NUM = /\b\d[\d,]*(?:\.\d+)?\b/g;

/** Changes one number in the text so the statement becomes false. Returns null if no usable number. */
export function fakeify(text: string, rng: Rng): string | null {
  const matches = [...text.matchAll(NUM)].filter((m) => {
    const v = Number(m[0].replace(/,/g, ''));
    return Number.isFinite(v) && v > 1;
  });
  if (!matches.length) return null;
  const m = pick(rng, matches);
  const raw = m[0];
  const v = Number(raw.replace(/,/g, ''));
  let fake: number;
  if (v >= 1000 && v <= 2030 && !raw.includes(',')) {
    // probably a year: shift it believably
    const shift = (60 + randInt(rng, 240)) * (rng() < 0.5 ? -1 : 1);
    fake = Math.min(2024, v + shift);
  } else {
    const factor = pick(rng, [0.25, 0.4, 2.5, 3, 4, 10]);
    fake = Math.max(2, Math.round(v * factor));
  }
  if (fake === v) return null;
  const fakeStr = raw.includes(',') ? fake.toLocaleString('en-US') : String(fake);
  return text.slice(0, m.index) + fakeStr + text.slice((m.index ?? 0) + raw.length);
}

export function generateRealFake(facts: readonly Fact[], rng: Rng, key: string): RealFakeCardData | null {
  for (let attempt = 0; attempt < 30; attempt++) {
    const f = pick(rng, facts);
    if (!NUM.test(f.text)) continue;
    NUM.lastIndex = 0;
    const real = rng() < 0.5;
    const statement = real ? f.text : fakeify(f.text, rng);
    if (!statement) continue;
    return {
      kind: 'realFake',
      key,
      category: f.category,
      statement,
      isReal: real,
      original: f.text,
      source: f.source,
    };
  }
  return null;
}
