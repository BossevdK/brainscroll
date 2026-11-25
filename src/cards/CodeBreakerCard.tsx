import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CodeBreakerCardData } from './types';
import { CardShell } from './CardShell';
import { PrimaryButton, Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { CODE_COLORS, type PegHint, scoreCode, scoreCodePositions } from '../puzzles/mind';
import { increment } from '../store/progress';
import { categoryTheme, colors } from '../theme';

const MAX_TRIES = 8;
const HINT_COLOR: Record<PegHint, string> = { hit: '#3DAA6B', present: '#C9A227', miss: '#3A3B44' };

function Peg({ c, size = 30, hint }: { c?: number; size?: number; hint?: PegHint }) {
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <View
        style={[
          styles.peg,
          { width: size, height: size, borderRadius: size / 2 },
          c !== undefined ? { backgroundColor: CODE_COLORS[c], borderColor: CODE_COLORS[c] } : null,
        ]}
      />
      {hint ? <View style={[styles.hintBar, { backgroundColor: HINT_COLOR[hint] }]} /> : null}
    </View>
  );
}

function classicText(exact: number, near: number): string {
  if (exact === 0 && near === 0) return 'none of these colours';
  const parts: string[] = [];
  if (exact) parts.push(`${exact} right spot`);
  if (near) parts.push(`${near} wrong spot`);
  return parts.join(' · ');
}

/**
 * Crack a 4-colour code.
 * Easy mode: a coloured bar under every peg (green = right spot, yellow = wrong spot, grey = not in code).
 * Classic mode (after 3 cracked codes): only how many are right, not which ones.
 */
export const CodeBreakerCard = memo(function CodeBreakerCard({ card, height }: { card: CodeBreakerCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const easy = card.mode === 'easy';
  const pegs = card.code.length;
  const maxTries = MAX_TRIES;
  const [rows, setRows] = useState<{ guess: number[]; exact: number; near: number; hints: PegHint[] }[]>([]);
  const [current, setCurrent] = useState<number[]>([]);
  const won = rows.some((r) => r.exact === pegs);
  const over = won || rows.length >= maxTries;

  const addColor = (c: number) => {
    if (over || current.length >= pegs) return;
    tick();
    setCurrent([...current, c]);
  };

  const check = () => {
    if (current.length < pegs) return;
    const s = scoreCode(current, card.code);
    const r = [...rows, { guess: current, ...s, hints: scoreCodePositions(current, card.code) }];
    setRows(r);
    setCurrent([]);
    if (s.exact === pegs) {
      increment('codeBreakerWins');
      answered(card, true);
    } else if (r.length >= maxTries) answered(card, false);
  };

  return (
    <CardShell category={card.category} level={card.level} label="Code breaker" height={height}>
      <Text style={styles.prompt}>Crack the {pegs}-colour code</Text>
      {easy ? (
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: HINT_COLOR.hit }]} />
          <Text style={styles.legendText}>right spot</Text>
          <View style={[styles.legendDot, { backgroundColor: HINT_COLOR.present }]} />
          <Text style={styles.legendText}>wrong spot</Text>
          <View style={[styles.legendDot, { backgroundColor: HINT_COLOR.miss }]} />
          <Text style={styles.legendText}>not in code</Text>
        </View>
      ) : (
        <Text style={styles.sub}>Classic mode: you only learn how many are right, not which ones. Colours can repeat.</Text>
      )}

      <View style={styles.board}>
        {rows.map((r, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.rowNum}>{i + 1}</Text>
            {r.guess.map((c, j) => (
              <Peg key={j} c={c} hint={easy ? r.hints[j] : undefined} />
            ))}
            {!easy && <Text style={styles.feedback}>{classicText(r.exact, r.near)}</Text>}
          </View>
        ))}
        {!over && (
          <View style={[styles.row, styles.currentRow, { borderColor: accent }]}>
            <Text style={styles.rowNum}>{rows.length + 1}</Text>
            {Array.from({ length: pegs }, (_, j) => (
              <Pressable key={j} onPress={() => setCurrent(current.slice(0, j))}>
                <Peg c={current[j]} />
              </Pressable>
            ))}
            <Text style={styles.feedback}>{current.length ? 'tap a peg to undo' : 'pick colours below'}</Text>
          </View>
        )}
      </View>

      {over ? (
        <View>
          <View style={[styles.row, { marginTop: 12 }]}>
            <Text style={styles.rowNum}>🔓</Text>
            {card.code.map((c, j) => (
              <Peg key={j} c={c} />
            ))}
          </View>
          <Result
            ok={won}
            title={won ? `Cracked in ${rows.length}!` : 'Out of tries'}
            text={won && easy ? 'Crack 3 codes and you unlock classic mode.' : undefined}
          />
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={styles.palette}>
            {Array.from({ length: card.colors }, (_, c) => (
              <Pressable key={c} onPressIn={() => addColor(c)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.9 }] }]}>
                <Peg c={c} size={44} />
              </Pressable>
            ))}
          </View>
          <PrimaryButton
            label={`Check (${maxTries - rows.length} tries left)`}
            accent={current.length === pegs ? accent : colors.surfaceStrong}
            onPress={check}
          />
        </View>
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 12, flexWrap: 'wrap' },
  legendDot: { width: 14, height: 6, borderRadius: 3 },
  legendText: { color: colors.textDim, fontSize: 13, marginRight: 8 },
  board: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 },
  currentRow: { borderWidth: 1.5 },
  rowNum: { color: colors.textDim, width: 22, fontSize: 13, fontWeight: '700' },
  peg: { borderWidth: 2, borderColor: colors.border },
  hintBar: { width: 22, height: 5, borderRadius: 3 },
  feedback: { flex: 1, color: colors.textDim, fontSize: 13, marginLeft: 4 },
  controls: { gap: 14, marginTop: 14 },
  palette: { flexDirection: 'row', justifyContent: 'space-between' },
});
