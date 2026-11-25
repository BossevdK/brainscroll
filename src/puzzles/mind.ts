// Generators for the brain-training and daily-style games. Pure functions, unit tested.
import type { ChoiceCardData } from '../cards/types.ts';
import { type Rng, pick, randInt, shuffle } from '../lib/rng.ts';

// ---------------------------------------------------------------- Order memory (numbers on a grid)

/** Level 0 → 4 numbers … level 8+ → 12 numbers. */
export function makeOrderMemory(rng: Rng, level: number) {
  const cols = 5;
  const rows = 5;
  const count = Math.min(12, 4 + level);
  const cells = shuffle(rng, Array.from({ length: cols * rows }, (_, i) => i)).slice(0, count);
  return { cols, rows, cells }; // cells[i] holds number i+1
}

// ---------------------------------------------------------------- Pattern memory

/** 4×4 grid (levels 0–2) → 5×5 (3–5) → 6×6 (6+), with more tiles to remember. */
export function makePattern(rng: Rng, level: number) {
  const size = level < 3 ? 4 : level < 6 ? 5 : 6;
  const count = size === 4 ? 4 + level : size === 5 ? 6 + (level - 3) : Math.min(13, 8 + (level - 6));
  const cells = shuffle(rng, Array.from({ length: size * size }, (_, i) => i)).slice(0, count);
  return { size, cells };
}

// ---------------------------------------------------------------- Color clash (Stroop)

export const STROOP_COLORS = [
  { name: 'RED', hex: '#FF5A5F' },
  { name: 'BLUE', hex: '#4D9DFF' },
  { name: 'GREEN', hex: '#3DDC84' },
  { name: 'YELLOW', hex: '#FFD43B' },
] as const;

/** A word in a (usually) different ink colour. Answer = index of the INK colour. */
export function makeStroopTrial(rng: Rng) {
  const word = randInt(rng, STROOP_COLORS.length);
  let ink = randInt(rng, STROOP_COLORS.length);
  if (rng() < 0.8) while (ink === word) ink = randInt(rng, STROOP_COLORS.length);
  return { word, ink };
}

// ---------------------------------------------------------------- Same or mirrored (mental rotation)

export type Cell = [number, number];

function normalize(cells: Cell[]): Cell[] {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]) => [r - minR, c - minC] as Cell).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
const key = (cells: Cell[]) => normalize(cells).map((c) => c.join(',')).join(';');
export const rotate = (cells: Cell[]): Cell[] => normalize(cells.map(([r, c]) => [c, -r] as Cell));
export const mirror = (cells: Cell[]): Cell[] => normalize(cells.map(([r, c]) => [r, -c] as Cell));

function rotations(cells: Cell[]): string[] {
  const out: string[] = [];
  let cur = normalize(cells);
  for (let i = 0; i < 4; i++) {
    out.push(key(cur));
    cur = rotate(cur);
  }
  return out;
}

/** A shape that is NOT the same as its mirror image (otherwise the question is unfair). */
function makeChiralShape(rng: Rng, size: number): Cell[] {
  for (;;) {
    const cells: Cell[] = [[0, 0]];
    while (cells.length < size) {
      const [r, c] = pick(rng, cells);
      const [dr, dc] = pick(rng, [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as Cell[]);
      const n: Cell = [r + dr, c + dc];
      if (!cells.some((x) => x[0] === n[0] && x[1] === n[1])) cells.push(n);
    }
    const shape = normalize(cells);
    const span = Math.max(...shape.map((c) => Math.max(c[0], c[1])));
    if (span > (size > 6 ? 4 : 3)) continue; // keep it within 4×4 (5×5 for big shapes)
    if (!rotations(shape).includes(key(mirror(shape)))) return shape;
  }
}

/** Shapes grow from 5 squares (level 0) to 8 squares (level 9+). */
export function makeRotation(rng: Rng, level: number) {
  const a = makeChiralShape(rng, 5 + Math.min(3, Math.floor(level / 3)));
  const mirrored = rng() < 0.5;
  let b = mirrored ? mirror(a) : a;
  const turns = 1 + randInt(rng, 3);
  for (let i = 0; i < turns; i++) b = rotate(b);
  return { a, b, mirrored };
}

export function isRotationOf(a: Cell[], b: Cell[]): boolean {
  return rotations(a).includes(key(b));
}

// ---------------------------------------------------------------- Mini sudoku (4×4 and 6×6)

/** Box shape: 4×4 has 2×2 boxes, 6×6 has boxes of 2 rows × 3 columns. */
export const sudokuBox = (n: number) => (n === 6 ? { rows: 2, cols: 3 } : { rows: 2, cols: 2 });

export function canPlace(grid: number[], r: number, c: number, v: number, n = 4): boolean {
  for (let k = 0; k < n; k++) {
    if (k !== c && grid[r * n + k] === v) return false;
    if (k !== r && grid[k * n + c] === v) return false;
  }
  const box = sudokuBox(n);
  const br = r - (r % box.rows);
  const bc = c - (c % box.cols);
  for (let rr = br; rr < br + box.rows; rr++)
    for (let cc = bc; cc < bc + box.cols; cc++) if ((rr !== r || cc !== c) && grid[rr * n + cc] === v) return false;
  return true;
}

function countSolutions(grid: number[], n: number, limit = 2): number {
  const i = grid.indexOf(0);
  if (i < 0) return 1;
  const r = Math.floor(i / n);
  const c = i % n;
  let count = 0;
  for (let v = 1; v <= n && count < limit; v++) {
    if (canPlace(grid, r, c, v, n)) {
      grid[i] = v;
      count += countSolutions(grid, n, limit - count);
      grid[i] = 0;
    }
  }
  return count;
}

/** Shuffles groups of `size` consecutive indices and the indices inside each group. */
function blockShuffle(rng: Rng, n: number, size: number): number[] {
  const blocks = shuffle(rng, Array.from({ length: n / size }, (_, b) => b));
  return blocks.flatMap((b) => shuffle(rng, Array.from({ length: size }, (_, k) => b * size + k)));
}

/**
 * Levels 0–3: 4×4 with fewer and fewer given numbers. Level 4+: 6×6.
 * The puzzle always has exactly one solution.
 */
export function makeSudoku(rng: Rng, level: number) {
  const n = level < 4 ? 4 : 6;
  const box = sudokuBox(n);
  const givens = n === 4 ? [8, 7, 6, 5][level] : Math.max(12, 18 - (level - 4));
  const digits = shuffle(rng, Array.from({ length: n }, (_, k) => k + 1));
  const rows = blockShuffle(rng, n, box.rows);
  const cols = blockShuffle(rng, n, box.cols);
  // Classic valid pattern, then relabel digits and shuffle rows/columns within bands/stacks.
  const base = (r: number, c: number) => (box.cols * (r % box.rows) + Math.floor(r / box.rows) + c) % n;
  const solution = rows.flatMap((r) => cols.map((c) => digits[base(r, c)]));

  const puzzle = solution.slice();
  for (const i of shuffle(rng, Array.from({ length: n * n }, (_, k) => k))) {
    if (puzzle.filter(Boolean).length <= givens) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle.slice(), n) !== 1) puzzle[i] = keep;
  }
  return { puzzle, solution };
}

// ---------------------------------------------------------------- Word groups

export type WordGroup = { label: string; kind: string; members: string[]; decoys: string[] };

export function makeOddOneOut(groups: readonly WordGroup[], rng: Rng, key: string): ChoiceCardData {
  const g = pick(rng, groups);
  const members = shuffle(rng, g.members).slice(0, 3);
  const odd = pick(rng, g.decoys.filter((d) => !g.members.includes(d)));
  const options = shuffle(rng, [...members, odd]);
  return {
    kind: 'choice',
    key,
    category: 'brain',
    label: 'Odd one out',
    prompt: 'Which one doesn’t belong?',
    options,
    answer: options.indexOf(odd),
    explanation: `The others are all ${g.label}.`,
  };
}

/** 4 groups of 4 (all different kinds so there's exactly one right answer). */
export function makeGroupSort(groups: readonly WordGroup[], rng: Rng) {
  for (;;) {
    const chosen: WordGroup[] = [];
    for (const g of shuffle(rng, groups)) {
      if (chosen.length === 4) break;
      if (chosen.some((c) => c.kind === g.kind)) continue;
      chosen.push(g);
    }
    const used = new Set<string>();
    const result: { label: string; words: string[] }[] = [];
    let ok = true;
    for (const g of chosen) {
      const others = new Set(chosen.filter((c) => c !== g).flatMap((c) => c.members));
      const pool = shuffle(rng, g.members.filter((m) => !others.has(m) && !used.has(m)));
      if (pool.length < 4) {
        ok = false;
        break;
      }
      const words = pool.slice(0, 4);
      words.forEach((w) => used.add(w));
      result.push({ label: g.label, words });
    }
    if (ok && result.length === 4) return { groups: result, tiles: shuffle(rng, result.flatMap((r) => r.words)) };
  }
}

// ---------------------------------------------------------------- Code breaker

export const CODE_COLORS = ['#FF5A5F', '#4D9DFF', '#3DDC84', '#FFD43B', '#C084FC', '#FB923C', '#F472B6'];

/** Level 0–2: 4 pegs, 5 colours · 3–6: 4 pegs, 6 colours · 7+: 5 pegs, 7 colours. */
export function makeCode(rng: Rng, level: number) {
  const colors = level < 3 ? 5 : level < 7 ? 6 : 7;
  const pegs = level < 7 ? 4 : 5;
  return { code: Array.from({ length: pegs }, () => randInt(rng, colors)), colors };
}

/** exact = right colour right place; near = right colour wrong place. */
export function scoreCode(guess: number[], code: number[]) {
  let exact = 0;
  const g: Record<number, number> = {};
  const c: Record<number, number> = {};
  guess.forEach((v, i) => {
    if (v === code[i]) exact++;
    else {
      g[v] = (g[v] ?? 0) + 1;
      c[code[i]] = (c[code[i]] ?? 0) + 1;
    }
  });
  let near = 0;
  for (const k of Object.keys(g)) near += Math.min(g[+k], c[+k] ?? 0);
  return { exact, near };
}

export type PegHint = 'hit' | 'present' | 'miss';

/**
 * Easy mode: a hint per position (like Word guess). Handles repeated colours: a colour
 * is only "present" as often as it still occurs in the code.
 */
export function scoreCodePositions(guess: number[], code: number[]): PegHint[] {
  const res: PegHint[] = guess.map(() => 'miss');
  const left: Record<number, number> = {};
  guess.forEach((v, i) => {
    if (v === code[i]) res[i] = 'hit';
    else left[code[i]] = (left[code[i]] ?? 0) + 1;
  });
  guess.forEach((v, i) => {
    if (res[i] !== 'hit' && left[v]) {
      res[i] = 'present';
      left[v]--;
    }
  });
  return res;
}

// ---------------------------------------------------------------- Mini nonogram

const NONO_SIZES = [5, 5, 6, 6, 7, 7, 8, 8, 10, 10, 10];

/**
 * Bigger grids as you level up: 5×5 → 6×6 → 7×7 → 8×8 → 10×10.
 * Every puzzle can be solved with pure logic (checked by a line solver), no guessing.
 */
export function makeNonogram(rng: Rng, level: number) {
  const size = NONO_SIZES[Math.min(level, NONO_SIZES.length - 1)];
  // Odd levels are a bit sparser (= fewer obvious rows) than even ones.
  let density = level % 2 === 1 ? 0.55 : 0.6;
  for (let attempt = 0; ; attempt++) {
    if (attempt > 0 && attempt % 60 === 0) density = Math.min(0.75, density + 0.03);
    const cells = Array.from({ length: size * size }, () => rng() < density);
    let fine = true;
    for (let i = 0; i < size && fine; i++) {
      if (!cells.slice(i * size, i * size + size).some(Boolean)) fine = false;
      if (!Array.from({ length: size }, (_, r) => cells[r * size + i]).some(Boolean)) fine = false;
    }
    if (!fine) continue;
    const rows = rowClues(cells, size);
    const cols = colClues(cells, size);
    if (solveByLines(rows, cols, size)) return { size, cells, rows, cols };
  }
}

const lineCache = new Map<string, boolean[][]>();
/** Every way to place these runs in a line of length n. */
function placements(clue: number[], n: number): boolean[][] {
  const key = clue.join(',') + '/' + n;
  const cached = lineCache.get(key);
  if (cached) return cached;
  const out: boolean[][] = [];
  const runsToPlace = clue[0] === 0 ? [] : clue;
  const place = (idx: number, pos: number, line: boolean[]) => {
    if (idx === runsToPlace.length) {
      out.push(line.slice());
      return;
    }
    const len = runsToPlace[idx];
    const rest = runsToPlace.slice(idx + 1).reduce((t, x) => t + x + 1, 0);
    for (let start = pos; start + len + rest <= n; start++) {
      for (let k = 0; k < len; k++) line[start + k] = true;
      place(idx + 1, start + len + 1, line);
      for (let k = 0; k < len; k++) line[start + k] = false;
    }
  };
  place(0, 0, Array(n).fill(false));
  lineCache.set(key, out);
  return out;
}

/** True if the clues determine the whole picture using only row/column logic. */
export function solveByLines(rows: number[][], cols: number[][], n: number): boolean {
  const grid: (boolean | null)[] = Array(n * n).fill(null);
  const lineIdx = (isRow: boolean, i: number) => Array.from({ length: n }, (_, k) => (isRow ? i * n + k : k * n + i));
  let changed = true;
  while (changed) {
    changed = false;
    for (const isRow of [true, false]) {
      for (let i = 0; i < n; i++) {
        const idx = lineIdx(isRow, i);
        const known = idx.map((j) => grid[j]);
        if (known.every((v) => v !== null)) continue;
        const options = placements(isRow ? rows[i] : cols[i], n).filter((pl) =>
          pl.every((v, k) => known[k] === null || known[k] === v),
        );
        if (!options.length) return false;
        for (let k = 0; k < n; k++) {
          if (known[k] !== null) continue;
          const first = options[0][k];
          if (options.every((pl) => pl[k] === first)) {
            grid[idx[k]] = first;
            changed = true;
          }
        }
      }
    }
  }
  return grid.every((v) => v !== null);
}

function runs(line: boolean[]): number[] {
  const out: number[] = [];
  let n = 0;
  for (const v of line) {
    if (v) n++;
    else if (n) {
      out.push(n);
      n = 0;
    }
  }
  if (n) out.push(n);
  return out.length ? out : [0];
}
export const rowClues = (cells: boolean[], size: number) =>
  Array.from({ length: size }, (_, r) => runs(cells.slice(r * size, r * size + size)));
export const colClues = (cells: boolean[], size: number) =>
  Array.from({ length: size }, (_, c) => runs(Array.from({ length: size }, (__, r) => cells[r * size + c])));

/** Solved = every row and column matches its clue. (Puzzles have exactly one solution, see solveByLines.) */
export function nonogramSolved(cells: boolean[], size: number, rows: number[][], cols: number[][]): boolean {
  const same = (a: number[][], b: number[][]) => a.every((x, i) => x.join() === b[i].join());
  return same(rowClues(cells, size), rows) && same(colClues(cells, size), cols);
}

// ---------------------------------------------------------------- Country hunt

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Compass arrow pointing from (lat1,lon1) towards (lat2,lon2). */
export function directionArrow(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'][Math.round(bearing / 45) % 8];
}
