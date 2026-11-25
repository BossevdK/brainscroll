// Live content from free, keyless APIs. Everything is optional: if there's no internet
// the queues stay empty and the feed simply uses offline cards.
import type { Category, Fact } from '../cards/types';

export type TriviaItem = {
  category: Category;
  question: string;
  options: string[];
  answer: number;
};

const trivia: TriviaItem[] = [];
const useless: Fact[] = [];
let triviaBusy = false;
let uselessBusy = false;
let lastTriviaFetch = 0;

// Open Trivia DB categories → ours. Politics and celebrities are skipped.
function mapCategory(c: string): Category | null {
  if (/Politics|Celebrities/i.test(c)) return null;
  if (/Computers|Gadgets|Vehicles/i.test(c)) return 'tech';
  if (/Mathematics/i.test(c)) return 'brain';
  if (/Science/i.test(c)) return 'science';
  if (/Animals/i.test(c)) return 'nature';
  if (/Geography/i.test(c)) return 'geography';
  if (/History|Mythology/i.test(c)) return 'history';
  if (/Entertainment|Art|Sports/i.test(c)) return 'culture';
  return 'random';
}

function shuffle<T>(a: T[]): T[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function refillTrivia() {
  // Open Trivia DB allows one request per 5 seconds per IP.
  if (triviaBusy || trivia.length >= 15 || Date.now() - lastTriviaFetch < 6000) return;
  triviaBusy = true;
  lastTriviaFetch = Date.now();
  try {
    const res = await fetch('https://opentdb.com/api.php?amount=40&type=multiple&encode=url3986');
    const json = await res.json();
    if (json.response_code !== 0) return;
    for (const r of json.results as {
      category: string;
      question: string;
      correct_answer: string;
      incorrect_answers: string[];
    }[]) {
      const category = mapCategory(decodeURIComponent(r.category));
      if (!category) continue;
      const correct = decodeURIComponent(r.correct_answer);
      const options = shuffle([correct, ...r.incorrect_answers.map(decodeURIComponent)]);
      trivia.push({
        category,
        question: decodeURIComponent(r.question),
        options,
        answer: options.indexOf(correct),
      });
    }
  } catch {
    // offline: ignore
  } finally {
    triviaBusy = false;
  }
}

async function refillUseless() {
  if (uselessBusy || useless.length >= 6) return;
  uselessBusy = true;
  try {
    for (let i = 0; i < 6; i++) {
      const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
      const f = (await res.json()) as { id: string; text: string; source_url?: string; permalink: string };
      if (!f?.text || f.text.length > 220 || useless.some((u) => u.id === f.id)) continue;
      useless.push({
        id: 'useless-' + f.id,
        category: 'random',
        text: f.text.trim(),
        source: f.source_url && /^https?:/.test(f.source_url) ? f.source_url : f.permalink,
      });
    }
  } catch {
    // offline: ignore
  } finally {
    uselessBusy = false;
  }
}

export function warmUpLiveSources() {
  refillTrivia();
  refillUseless();
}

export function takeTrivia(): TriviaItem | undefined {
  const t = trivia.shift();
  if (trivia.length < 5) refillTrivia();
  return t;
}

export function takeUselessFact(): Fact | undefined {
  const f = useless.shift();
  if (useless.length < 3) refillUseless();
  return f;
}
