import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PatternCardData } from './types';
import { CardShell } from './CardShell';
import { PrimaryButton, Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { categoryTheme, colors } from '../theme';

const MAX_MISTAKES = 2;

/** Some tiles light up briefly; tap the same tiles from memory. */
export const PatternCard = memo(function PatternCard({ card, height }: { card: PatternCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const [phase, setPhase] = useState<'idle' | 'showing' | 'input' | 'done'>('idle');
  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = () => {
    setPhase('showing');
    timer.current = setTimeout(() => setPhase('input'), 1200 + card.cells.length * 150);
  };

  const tap = (cell: number) => {
    if (phase !== 'input' || found.includes(cell) || wrong.includes(cell)) return;
    if (card.cells.includes(cell)) {
      tick();
      const f = [...found, cell];
      setFound(f);
      if (f.length === card.cells.length) {
        setPhase('done');
        answered(card, true);
      }
    } else {
      const w = [...wrong, cell];
      setWrong(w);
      if (w.length > MAX_MISTAKES) {
        setPhase('done');
        answered(card, false);
      }
    }
  };

  const won = phase === 'done' && found.length === card.cells.length;

  return (
    <CardShell category={card.category} level={card.level} label="Pattern memory" height={height}>
      <Text style={styles.prompt}>
        {phase === 'input' ? `Tap the ${card.cells.length} tiles` : `Remember ${card.cells.length} tiles`}
      </Text>
      <Text style={styles.sub}>
        {phase === 'input' ? `${found.length}/${card.cells.length} found · ${MAX_MISTAKES - wrong.length + 1} mistakes left` : 'They light up for a moment.'}
      </Text>
      <View style={styles.grid}>
        {Array.from({ length: card.size * card.size }, (_, cell) => {
          const lit =
            phase === 'showing' ||
            (phase === 'done' && card.cells.includes(cell));
          const isTarget = card.cells.includes(cell);
          return (
            <Pressable key={cell} onPressIn={() => tap(cell)} style={[styles.cell, { width: `${100 / card.size}%` }]}>
              <View
                style={[
                  styles.inner,
                  lit && isTarget && { backgroundColor: accent },
                  found.includes(cell) && { backgroundColor: colors.good },
                  wrong.includes(cell) && { backgroundColor: colors.bad },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      {phase === 'idle' && (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="Show me" accent={accent} onPress={show} />
        </View>
      )}
      {phase === 'done' && <Result ok={won} title={won ? 'Perfect recall!' : `${found.length} of ${card.cells.length}`} />}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 15, marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', aspectRatio: 1 },
  cell: { aspectRatio: 1, padding: 4 },
  inner: { flex: 1, borderRadius: 10, backgroundColor: colors.surfaceStrong },
});
