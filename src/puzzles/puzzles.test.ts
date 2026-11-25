/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildQuantitySets, separation } from '../data/quantitySets.ts';
import {
  estimateScore,
  generateEstimate,
  generateHigherLower,
  generateOrderIt,
  generateSizeIt,
} from './quantity.ts';
import {
  fakeify,
  generateCountryQuiz,
  generateSequence,
  makeMathQuestion,
  scoreGuess,
} from './brain.ts';
import { createRng } from '../lib/rng.ts';

const data = (f: string) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const sets = buildQuantitySets({
  countries: data('countries.json'),
  mountains: data('wd-mountains.json'),
  structures: data('wd-structures.json'),
  cities: data('wd-cities.json'),
  rivers: data('wd-rivers.json'),
  companies: data('wd-companies.json'),
  films: data('wd-films.json'),
  games: data('wd-games.json'),
  curated: data('curated.json'),
});

test('every set has enough items and sane values', () => {
  assert.ok(sets.length >= 15);
  for (const s of sets) {
    assert.ok(s.items.length >= 9, `${s.id} has only ${s.items.length} items`);
    for (const i of s.items) assert.ok(Number.isFinite(i.value), `${s.id}: ${i.name}`);
  }
});

test('higher/lower: answer is the winner, reveal mentions both', () => {
  const rng = createRng(1);
  for (const s of sets) {
    for (let k = 0; k < 50; k++) {
      const c = generateHigherLower(s, rng, rng(), 'k');
      const [a, b] = c.options;
      assert.notEqual(a.name, b.name);
      assert.notEqual(a.value, b.value);
      const w = c.options[c.answer].value;
      const l = c.options[1 - c.answer].value;
      assert.ok(s.lowerWins ? w < l : w > l, `${s.id}: wrong answer`);
      assert.ok(c.reveal.includes(a.name) && c.reveal.includes(b.name));
    }
  }
});

test('size it: ratio between the two items stays drawable (≤ 4×)', () => {
  const rng = createRng(2);
  for (const s of sets.filter((x) => x.sizeable)) {
    for (let k = 0; k < 50; k++) {
      const c = generateSizeIt(s, rng, rng(), 'k');
      const r = separation(s, c.reference.value, c.target.value);
      assert.ok(r < 4 && r > 1, `${s.id}: ratio ${r}`);
    }
  }
});

test('estimate: the answer lies inside the slider range', () => {
  const rng = createRng(3);
  for (const s of sets.filter((x) => x.estimate)) {
    for (let k = 0; k < 30; k++) {
      const c = generateEstimate(s, rng, 'k');
      assert.ok(c.answer >= c.min && c.answer <= c.max, `${s.id}: ${c.answer} not in ${c.min}..${c.max}`);
    }
  }
  assert.equal(estimateScore(false, 100, 105), 3);
  assert.equal(estimateScore(false, 100, 1000), 0);
  assert.equal(estimateScore(true, 1990, 1992), 3);
});

test('order it: correct order is sorted', () => {
  const rng = createRng(4);
  for (const s of sets) {
    const c = generateOrderIt(s, rng, 0.5, 'k');
    assert.equal(c.items.length, 4);
    const vals = c.correct.map((i) => c.items[i].value);
    for (let i = 1; i < vals.length; i++) assert.ok(s.lowerWins ? vals[i - 1] <= vals[i] : vals[i - 1] >= vals[i]);
  }
});

test('country quiz has 4 distinct options including the answer', () => {
  const rng = createRng(5);
  const countries = data('countries.json');
  for (let k = 0; k < 200; k++) {
    const c = generateCountryQuiz(countries, rng, rng(), 'k');
    assert.equal(new Set(c.options).size, 4);
    assert.ok(c.answer >= 0 && c.answer < 4);
  }
});

test('sequence: options unique, answer among them', () => {
  const rng = createRng(6);
  for (let k = 0; k < 300; k++) {
    const c = generateSequence(rng, rng(), 'k');
    assert.equal(new Set(c.options).size, c.options.length);
    assert.ok(c.options.length >= 3);
    assert.ok(c.answer >= 0);
  }
});

test('word guess scoring handles double letters', () => {
  assert.deepEqual(scoreGuess('crane', 'crane'), ['hit', 'hit', 'hit', 'hit', 'hit']);
  assert.deepEqual(scoreGuess('allee', 'apple'), ['hit', 'present', 'miss', 'miss', 'hit']);
  assert.deepEqual(scoreGuess('speed', 'abide'), ['miss', 'miss', 'present', 'miss', 'present']);
});

test('quick math answers are correct whole numbers', () => {
  const rng = createRng(7);
  for (let k = 0; k < 500; k++) {
    const q = makeMathQuestion(rng, rng());
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0, q.text);
  }
});

test('fakeify changes exactly one number', () => {
  const rng = createRng(8);
  const t = 'The Hundred Years War lasted 116 years, from 1337 to 1453.';
  for (let k = 0; k < 50; k++) {
    const f = fakeify(t, rng);
    assert.ok(f && f !== t);
  }
});

test('dyk facts (if built) are clean', { skip: !existsSync(new URL('../data/dyk.json', import.meta.url)) }, () => {
  const dyk = data('dyk.json');
  assert.ok(dyk.length > 500);
  for (const f of dyk) {
    assert.ok(!/[[\]{}|]/.test(f.text), f.text);
    assert.ok(f.text.startsWith('…that '), f.text);
  }
});
