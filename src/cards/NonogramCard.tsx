import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NonogramCardData } from './types';
import { CardShell } from './CardShell';
import { Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { colClues, nonogramSolved, rowClues } from '../puzzles/mind';
import { categoryTheme, colors } from '../theme';

type Mark = 0 | 1 | 2; // empty, filled, crossed

/**
 * Picture logic: the numbers tell how many filled squares are next to each other in that
 * row/column. Tap: fill → mark ✕ → empty.
 */
export const NonogramCard = memo(function NonogramCard({ card, height }: { card: NonogramCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const n = card.size;
  const [marks, setMarks] = useState<Mark[]>(() => Array(n * n).fill(0));
  const [result, setResult] = useState<null | 'won' | 'shown'>(null);

  const filled = marks.map((m) => m === 1);
  const curRows = rowClues(filled, n);
  const curCols = colClues(filled, n);
  const rowDone = (r: number) => curRows[r].join() === card.rows[r].join();
  const colDone = (c: number) => curCols[c].join() === card.cols[c].join();

  const tap = (i: number) => {
    if (result) return;
    tick();
    const m = marks.slice();
    m[i] = ((m[i] + 1) % 3) as Mark;
    setMarks(m);
    if (nonogramSolved(m.map((x) => x === 1), n, card.rows, card.cols)) {
      setResult('won');
      answered(card, true);
    }
  };

  const showFill = (i: number) => (result === 'shown' ? card.cells[i] : marks[i] === 1);
  // Bigger grids: wider clue column, smaller numbers, and a guide line every 5 squares.
  const clueW = n <= 6 ? 64 : n <= 8 ? 78 : 92;
  const clueFont = { fontSize: n <= 6 ? 16 : n <= 8 ? 14 : 12 };
  const guide = (k: number) => n >= 10 && k === 4;

  return (
    <CardShell category={card.category} level={card.level} label="Mini nonogram" height={height}>
      <Text style={styles.prompt}>Fill the grid</Text>
      <Text style={styles.sub}>Numbers = runs of filled squares in that row or column. Tap to fill, again for ✕.</Text>
      <View style={styles.wrap}>
        {/* column clues */}
        <View style={styles.colClues}>
          <View style={{ width: clueW }} />
          {card.cols.map((clue, c) => (
            <View key={c} style={[styles.colClue, guide(c) && { paddingRight: 2 }]}>
              {clue.map((v, k) => (
                <Text key={k} style={[styles.clue, clueFont, colDone(c) && styles.clueDone]}>
                  {v}
                </Text>
              ))}
            </View>
          ))}
        </View>
        {Array.from({ length: n }, (_, r) => (
          <View key={r} style={styles.row}>
            <View style={[styles.rowClue, { width: clueW }]}>
              <Text style={[styles.clue, clueFont, rowDone(r) && styles.clueDone]}>{card.rows[r].join(' ')}</Text>
            </View>
            {Array.from({ length: n }, (__, c) => {
              const i = r * n + c;
              return (
                <Pressable
                  key={c}
                  onPressIn={() => tap(i)}
                  style={[styles.cellWrap, n >= 8 && { padding: 1 }, guide(c) && { paddingRight: 3 }, guide(r) && { paddingBottom: 3 }]}
                >
                  <View
                    style={[styles.cell, n >= 8 && { borderRadius: 4 }, showFill(i) && { backgroundColor: accent, borderColor: accent }]}
                  >
                    {marks[i] === 2 && result !== 'shown' && <Text style={styles.cross}>✕</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {result ? (
        <Result ok={result === 'won'} title={result === 'won' ? 'Solved!' : 'Here’s the solution'} />
      ) : (
        <Pressable
          onPress={() => {
            setResult('shown');
            answered(card, false);
          }}
          style={styles.giveUp}
        >
          <Text style={styles.giveUpText}>Show solution</Text>
        </Pressable>
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 14, marginTop: 4, marginBottom: 14, lineHeight: 19 },
  wrap: { alignSelf: 'center', width: '100%' },
  colClues: { flexDirection: 'row', alignItems: 'flex-end' },
  colClue: { flex: 1, alignItems: 'center', paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowClue: { alignItems: 'flex-end', paddingRight: 8 },
  clue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  clueDone: { color: colors.textDim, opacity: 0.5 },
  cellWrap: { flex: 1, aspectRatio: 1, padding: 2 },
  cell: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: { color: colors.textDim, fontSize: 18, fontWeight: '800' },
  giveUp: { alignSelf: 'center', marginTop: 16, padding: 6 },
  giveUpText: { color: colors.textDim, fontSize: 14, textDecorationLine: 'underline' },
});
