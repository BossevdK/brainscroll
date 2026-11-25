/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeReviewCard, titleOf } from './review.ts';
import { createRng } from '../lib/rng.ts';
import type { Fact } from '../cards/types.ts';

const load = (f: string): Fact[] => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const facts = [...load('facts.json'), ...load('dyk.json')];

test('title from a Wikipedia source', () => {
  assert.equal(titleOf({ id: 'x', category: 'nature', text: '', source: 'Eiffel_Tower' }), 'Eiffel Tower');
  assert.equal(titleOf({ id: 'x', category: 'nature', text: '', source: 'Jiffy_(time)' }), 'Jiffy');
});

test('review cards: correct answer is the blanked subject (or a fair real/fake)', () => {
  const rng = createRng(11);
  let made = 0;
  let cloze = 0;
  for (const f of facts.slice(0, 800)) {
    const c = makeReviewCard(f, facts, rng, 'k');
    if (!c) continue;
    made++;
    assert.equal(c.reviewOf, f.id);
    if (c.kind === 'choice') {
      cloze++;
      assert.ok(c.prompt.includes('_____'));
      assert.equal(new Set(c.options).size, 4);
      const answer = c.options[c.answer];
      assert.ok(f.text.toLowerCase().includes(answer.toLowerCase()), `${answer} not in ${f.text}`);
    } else if (c.kind === 'realFake') {
      assert.ok(c.isReal ? c.statement === f.text : c.statement !== f.text);
    }
  }
  assert.ok(made > 400, `only ${made} review cards`);
  assert.ok(cloze > 300, `only ${cloze} fill-in-the-blank cards`);
});
