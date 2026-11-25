import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SudokuCardData } from './types';
import { CardShell } from './CardShell';
import { Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { canPlace, sudokuBox } from '../puzzles/mind';
import { categoryTheme, colors } from '../theme';

/** 4×4 or 6×6 sudoku: every row, column and box holds each number once. */
export const SudokuCard = memo(function SudokuCard({ card, height }: { card: SudokuCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const [grid, setGrid] = useState<number[]>(card.puzzle);
  const [sel, setSel] = useState<number | null>(card.puzzle.findIndex((v) => v === 0));
  const [result, setResult] = useState<null | 'won' | 'shown'>(null);
  const n = Math.round(Math.sqrt(card.solution.length));
  const box = sudokuBox(n);

  const conflict = (i: number) => grid[i] !== 0 && !canPlace(grid, Math.floor(i / n), i % n, grid[i], n);

  const put = (v: number) => {
    if (result || sel === null || card.puzzle[sel] !== 0) return;
    tick();
    const g = grid.slice();
    g[sel] = v;
    setGrid(g);
    if (v === 0) return; // erase: stay on this cell
    if (g.every((x, i) => x === card.solution[i])) {
      setResult('won');
      answered(card, true);
      return;
    }
    // jump to the next empty cell
    const nextEmpty = g.findIndex((x, i) => x === 0 && i > sel);
    if (nextEmpty >= 0) setSel(nextEmpty);
  };

  return (
    <CardShell category={card.category} level={card.level} label="Mini sudoku" height={height}>
      <Text style={styles.prompt}>Fill in 1–{n}</Text>
      <Text style={styles.sub}>
        Each row, column and {box.rows}×{box.cols} box has every number once.
      </Text>
      <View style={[styles.grid, { width: n === 6 ? '96%' : '80%' }]}>
        {grid.map((v, i) => {
          const given = card.puzzle[i] !== 0;
          const r = Math.floor(i / n);
          const c = i % n;
          return (
            <Pressable
              key={i}
              onPressIn={() => !given && !result && setSel(i)}
              style={[
                styles.cell,
                { width: `${100 / n}%` },
                c % box.cols === box.cols - 1 && c < n - 1 && styles.thickRight,
                r % box.rows === box.rows - 1 && r < n - 1 && styles.thickBottom,
                sel === i && !result && { backgroundColor: accent + '44' },
                result === 'won' && { backgroundColor: 'rgba(61,220,151,0.15)' },
              ]}
            >
              <Text
                style={[
                  styles.num,
                  n === 6 && { fontSize: 24 },
                  given ? styles.given : { color: accent },
                  conflict(i) && !given && { color: colors.bad },
                ]}
              >
                {result === 'shown' ? card.solution[i] : v || ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!result ? (
        <>
          <View style={styles.pad}>
            {[...Array.from({ length: n }, (_, k) => k + 1), 0].map((v) => (
              <Pressable key={v} onPressIn={() => put(v)} style={({ pressed }) => [styles.key, pressed && { opacity: 0.7 }]}>
                <Text style={styles.keyText}>{v || '⌫'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => {
              setResult('shown');
              answered(card, false);
            }}
            style={styles.giveUp}
          >
            <Text style={styles.giveUpText}>Show solution</Text>
          </Pressable>
        </>
      ) : (
        <Result ok={result === 'won'} title={result === 'won' ? 'Solved!' : 'Here’s the solution'} />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 15, marginTop: 4, marginBottom: 18 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: colors.textDim,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cell: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  thickRight: { borderRightWidth: 2, borderRightColor: colors.textDim },
  thickBottom: { borderBottomWidth: 2, borderBottomColor: colors.textDim },
  num: { fontSize: 30, fontWeight: '800' },
  given: { color: colors.text },
  pad: { flexDirection: 'row', gap: 6, marginTop: 18 },
  key: { flex: 1, height: 58, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
  keyText: { color: colors.text, fontSize: 24, fontWeight: '800' },
  giveUp: { alignSelf: 'center', marginTop: 14, padding: 6 },
  giveUpText: { color: colors.textDim, fontSize: 14, textDecorationLine: 'underline' },
});
