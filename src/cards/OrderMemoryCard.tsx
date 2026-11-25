import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OrderMemoryCardData } from './types';
import { CardShell } from './CardShell';
import { Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { categoryTheme, colors } from '../theme';

/**
 * Numbers 1…n sit on a grid. Tap 1 and the rest hide; then tap 2, 3, … from memory.
 * Trains working memory (it's the test chimpanzees famously beat humans at).
 */
export const OrderMemoryCard = memo(function OrderMemoryCard({ card, height }: { card: OrderMemoryCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const [next, setNext] = useState(1); // number you need to tap
  const [failedAt, setFailedAt] = useState<number | null>(null); // cell tapped wrongly
  const n = card.cells.length;
  const hidden = next > 1;
  const done = next > n || failedAt !== null;

  const tap = (cell: number) => {
    if (done) return;
    const num = card.cells.indexOf(cell) + 1;
    if (num === next) {
      tick();
      setNext(next + 1);
      if (next === n) answered(card, true);
    } else if (hidden) {
      setFailedAt(cell);
      answered(card, false);
    }
  };

  return (
    <CardShell category={card.category} level={card.level} label="Order memory" height={height}>
      <Text style={styles.prompt}>
        {next === 1 ? `Memorise 1 to ${n}, then tap 1` : done ? ' ' : `Now tap ${next}`}
      </Text>
      <Text style={styles.sub}>The other numbers hide once you start.</Text>
      <View style={styles.grid}>
        {Array.from({ length: card.cols * card.rows }, (_, cell) => {
          const num = card.cells.indexOf(cell) + 1;
          const has = num > 0;
          const tapped = has && num < next;
          const showNum = has && (!hidden || done || tapped);
          return (
            <Pressable
              key={cell}
              onPressIn={() => tap(cell)}
              style={[
                styles.cell,
                { width: `${100 / card.cols}%` },
              ]}
            >
              <View
                style={[
                  styles.inner,
                  has && !tapped && hidden && !done && { backgroundColor: colors.text },
                  has && (!hidden || done) && !tapped && { backgroundColor: colors.surfaceStrong },
                  tapped && { backgroundColor: accent },
                  failedAt === cell && { backgroundColor: colors.bad },
                ]}
              >
                {showNum && <Text style={[styles.num, tapped && { color: '#111' }]}>{num}</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
      {done && (
        <Result
          ok={failedAt === null}
          title={failedAt === null ? `All ${n} in order!` : `You got ${next - 1} of ${n}`}
          text={failedAt === null ? 'Sharp memory.' : 'The numbers are shown again so you can see where they were.'}
        />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 15, marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', aspectRatio: 1 },
  cell: { aspectRatio: 1, padding: 4 },
  inner: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  num: { color: colors.text, fontSize: 24, fontWeight: '900' },
});
