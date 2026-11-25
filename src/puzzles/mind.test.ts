/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canPlace,
  directionArrow,
  distanceKm,
  isRotationOf,
  makeCode,
  makeGroupSort,
  makeNonogram,
  makeOddOneOut,
  makeOrderMemory,
  makePattern,
  makeRotation,
  makeSudoku,
  mirror,
  nonogramSolved,
  scoreCode,
  solveByLines,
  scoreCodePositions,
  type WordGroup,
} from './mind.ts';
import { createRng } from '../lib/rng.ts';

const groups: WordGroup[] = JSON.parse(readFileSync(new URL('../data/groups.json', import.meta.url), 'utf8'));

test('memory games: distinct cells within the grid', () => {
  const rng = createRng(1);
  for (let k = 0; k < 110; k++) {
    const level = k % 11;
    const o = makeOrderMemory(rng, level);
    assert.equal(o.cells.length, Math.min(12, 4 + level));
    assert.equal(new Set(o.cells).size, o.cells.length);
    assert.ok(o.cells.every((c) => c >= 0 && c < o.cols * o.rows));
    const p = makePattern(rng, level);
    assert.equal(new Set(p.cells).size, p.cells.length);
    assert.ok(p.cells.every((c) => c < p.size * p.size));
  }
});

test('rotation: mirrored answer is always correct', () => {
  const rng = createRng(2);
  for (let k = 0; k < 200; k++) {
    const r = makeRotation(rng, k % 11);
    assert.equal(isRotationOf(r.a, r.b), !r.mirrored);
    assert.equal(isRotationOf(mirror(r.a), r.b), r.mirrored);
  }
});

test('sudoku: 4×4 at low levels, 6×6 later; valid solution that the puzzle matches', () => {
  const rng = createRng(3);
  for (let k = 0; k < 220; k++) {
    const level = k % 11;
    const { puzzle, solution } = makeSudoku(rng, level);
    const n = Math.sqrt(solution.length);
    assert.equal(n, level < 4 ? 4 : 6);
    for (let i = 0; i < n * n; i++) {
      assert.ok(canPlace(solution, Math.floor(i / n), i % n, solution[i], n), `level ${level} invalid`);
      if (puzzle[i]) assert.equal(puzzle[i], solution[i]);
    }
  }
});

test('odd one out: exactly one option is not a member', () => {
  const rng = createRng(4);
  for (let k = 0; k < 300; k++) {
    const c = makeOddOneOut(groups, rng, 'k');
    assert.equal(new Set(c.options).size, 4);
    const g = groups.find((x) => c.explanation === `The others are all ${x.label}.`)!;
    const nonMembers = c.options.filter((o) => !g.members.includes(o));
    assert.deepEqual(nonMembers, [c.options[c.answer]]);
  }
});

test('group sort: 16 unique tiles, no word belongs to two chosen groups', () => {
  const rng = createRng(5);
  for (let k = 0; k < 200; k++) {
    const s = makeGroupSort(groups, rng);
    assert.equal(s.tiles.length, 16);
    assert.equal(new Set(s.tiles).size, 16);
    for (const g of s.groups) {
      const src = groups.find((x) => x.label === g.label)!;
      for (const w of g.words) {
        const homes = s.groups.filter((h) => groups.find((x) => x.label === h.label)!.members.includes(w));
        assert.equal(homes.length, 1, `${w} fits ${homes.map((h) => h.label)}`);
        assert.ok(src.members.includes(w));
      }
    }
  }
});

test('code breaker scoring', () => {
  assert.deepEqual(scoreCode([0, 1, 2, 3], [0, 1, 2, 3]), { exact: 4, near: 0 });
  assert.deepEqual(scoreCode([0, 0, 1, 1], [1, 1, 0, 0]), { exact: 0, near: 4 });
  assert.deepEqual(scoreCode([0, 0, 0, 1], [0, 1, 2, 2]), { exact: 1, near: 1 });
  assert.deepEqual(scoreCodePositions([0, 0, 1, 1], [0, 1, 2, 2]), ['hit', 'miss', 'present', 'miss']);
  assert.deepEqual(scoreCodePositions([1, 1, 1, 1], [1, 2, 3, 1]), ['hit', 'miss', 'miss', 'hit']);
  const rng = createRng(6);
  const c = makeCode(rng, 0.9);
  assert.equal(c.code.length, 4);
});

test('nonogram: every level gives a logic-solvable puzzle, quickly', () => {
  const rng = createRng(7);
  for (let level = 0; level <= 10; level++) {
    const t0 = Date.now();
    for (let k = 0; k < 5; k++) {
      const n = makeNonogram(rng, level);
      assert.ok(nonogramSolved(n.cells, n.size, n.rows, n.cols));
      assert.ok(solveByLines(n.rows, n.cols, n.size));
    }
    const ms = (Date.now() - t0) / 5;
    assert.ok(ms < 400, `level ${level}: ${ms} ms per puzzle`);
  }
});

test('distance and direction', () => {
  const ams = [52.37, 4.9] as const;
  const paris = [48.86, 2.35] as const;
  const d = distanceKm(ams[0], ams[1], paris[0], paris[1]);
  assert.ok(d > 400 && d < 460, `${d}`);
  assert.equal(directionArrow(ams[0], ams[1], paris[0], paris[1]), '↙️');
});
