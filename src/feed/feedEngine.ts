import type { CardData, Fact } from '../cards/types';
import { ALL_FACTS, BASE_WEIGHTS, makePuzzleCard, type PuzzleKind } from './puzzleFactory';
import { makeReviewCard } from '../puzzles/review';
import { takeUselessFact } from '../sources/live';
import { hasSeenFact, resetSeenFacts } from '../store/seenFacts';
import { getLevel } from '../store/progress';
import { categoryWeight, kindWeight, timesShown } from '../store/engagement';
import { isCategoryEnabled } from '../store/settings';
import { dropReview, dueReviews } from '../store/reviews';
import { type Rng, createRng, shuffle } from '../lib/rng';

const RECENT_KINDS = 6; // a puzzle type doesn't come back within 6 puzzles
const SURPRISE = 0.15; // 15% of puzzles ignore your taste and pick something you see less
const REVIEW_EVERY = 6; // at most one "Remember this?" card per 6 cards

const factById = new Map(ALL_FACTS.map((f) => [f.id, f]));

/**
 * Produces the endless stream of cards: fact ↔ puzzle.
 * Smart mix: game types and fact categories you engage with show up more often
 * (weights learned on the device), with variety rules and ~15% surprises.
 * Due spaced-repetition reviews are mixed in now and then.
 */
export class FeedEngine {
  private rng: Rng;
  private factDeck: Fact[] = [];
  private counter = 0;
  private recentKinds: PuzzleKind[] = [];
  private recentSets: string[] = [];
  private lastFactCategory = '';
  private lastReviewAt = -REVIEW_EVERY;
  private queuedReviews = new Set<string>();

  constructor(seed = Date.now()) {
    this.rng = createRng(seed);
  }

  // ------------------------------------------------------------- facts

  /**
   * New random order every time, skipping facts you've already seen (remembered on the
   * device). Once fewer than 50 unseen facts are left, everything becomes new again.
   */
  private refillFactDeck() {
    const inDeck = new Set(this.factDeck.map((f) => f.id));
    let fresh = ALL_FACTS.filter((f) => !hasSeenFact(f.id) && !inDeck.has(f.id));
    if (fresh.length < 50) {
      resetSeenFacts();
      fresh = ALL_FACTS.filter((f) => !inDeck.has(f.id));
    }
    // Shuffled cards go *under* what's left, because we deal from the end.
    this.factDeck = [...shuffle(this.rng, fresh), ...this.factDeck];
  }

  private nextFact(): CardData {
    const key = `c${this.counter}`;
    // About 1 in 6 facts is a live "useless fact" when we have one.
    if (this.rng() < 0.17 && isCategoryEnabled('random')) {
      const u = takeUselessFact();
      if (u) return { kind: 'fact', key, category: u.category, fact: u, label: 'Useless fact' };
    }
    if (this.factDeck.length < 30) this.refillFactDeck();
    // Look at the next 20 facts and pick one weighted by how much you like its category,
    // never the same category twice in a row, and never a category you switched off.
    const end = this.factDeck.length - 1;
    const candidates: { idx: number; w: number }[] = [];
    for (let k = 0; k < 20 && end - k >= 0; k++) {
      const f = this.factDeck[end - k];
      if (!isCategoryEnabled(f.category)) continue;
      const w = categoryWeight(f.category) * (f.category === this.lastFactCategory ? 0.05 : 1);
      candidates.push({ idx: end - k, w });
    }
    let idx = end;
    if (candidates.length) {
      let r = this.rng() * candidates.reduce((s, c) => s + c.w, 0);
      idx = candidates[candidates.length - 1].idx;
      for (const c of candidates) {
        r -= c.w;
        if (r <= 0) {
          idx = c.idx;
          break;
        }
      }
    }
    const [fact] = this.factDeck.splice(idx, 1);
    this.lastFactCategory = fact.category;
    return { kind: 'fact', key, category: fact.category, fact, label: 'Did you know?' };
  }

  // ------------------------------------------------------------- puzzles

  private chooseKind(): PuzzleKind {
    const kinds = (Object.keys(BASE_WEIGHTS) as PuzzleKind[]).filter((k) => !this.recentKinds.includes(k));
    if (this.rng() < SURPRISE) {
      // Surprise: one of the games you've seen least, so your feed doesn't get too narrow.
      const least = [...kinds].sort((a, b) => timesShown(a) - timesShown(b)).slice(0, 5);
      return least[Math.floor(this.rng() * least.length)];
    }
    const weight = (k: PuzzleKind) => BASE_WEIGHTS[k] * kindWeight(k);
    let r = this.rng() * kinds.reduce((s, k) => s + weight(k), 0);
    for (const k of kinds) {
      r -= weight(k);
      if (r <= 0) return k;
    }
    return kinds[kinds.length - 1];
  }

  private nextReview(): CardData | null {
    if (this.counter - this.lastReviewAt < REVIEW_EVERY) return null;
    for (const id of dueReviews(3, this.queuedReviews)) {
      const fact = factById.get(id);
      const card = fact ? makeReviewCard(fact, ALL_FACTS, this.rng, `c${this.counter}`) : null;
      if (!card) {
        dropReview(id); // no good question possible for this one
        continue;
      }
      this.queuedReviews.add(id);
      this.lastReviewAt = this.counter;
      return card;
    }
    return null;
  }

  private nextPuzzle(): CardData {
    const review = this.nextReview();
    if (review) return review;
    for (let attempt = 0; attempt < 8; attempt++) {
      const kind = this.chooseKind();
      // Each game has its own level (up on a win, down on a loss).
      const card = makePuzzleCard(kind, this.rng, getLevel(kind), `c${this.counter}`, this.recentSets);
      if (card && isCategoryEnabled(card.category)) {
        this.recentKinds = [kind, ...this.recentKinds].slice(0, RECENT_KINDS);
        return card;
      }
    }
    return makePuzzleCard('sequence', this.rng, getLevel('sequence'), `c${this.counter}`)!;
  }

  next(count: number): CardData[] {
    const out: CardData[] = [];
    for (let i = 0; i < count; i++) {
      out.push(this.counter % 2 === 0 ? this.nextFact() : this.nextPuzzle());
      this.counter++;
    }
    return out;
  }

  /** A gentle break reminder, inserted by the feed screen. */
  breakCard(minutes: number): CardData {
    return { kind: 'break', key: `break${this.counter++}`, category: 'random', minutes };
  }
}
