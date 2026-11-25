import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OrderItCardData } from './types';
import { CardShell } from './CardShell';
import { Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { categoryTheme, colors } from '../theme';

/** Tap the items in the right order (1 → 4). Tap a numbered item to undo from there. */
export const OrderItCard = memo(function OrderItCard({ card, height }: { card: OrderItCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const [order, setOrder] = useState<number[]>([]);
  const done = order.length === card.items.length;
  const correctCount = done ? order.filter((idx, pos) => card.correct[pos] === idx).length : 0;

  const tap = (i: number) => {
    if (done) return;
    const pos = order.indexOf(i);
    if (pos >= 0) {
      setOrder(order.slice(0, pos));
      return;
    }
    const next = [...order, i];
    setOrder(next);
    tick();
    if (next.length === card.items.length) {
      const ok = next.every((idx, p) => card.correct[p] === idx);
      answered(card, ok);
    }
  };

  return (
    <CardShell category={card.category} level={card.level} label="Order it" height={height}>
      <Text style={styles.prompt}>{card.prompt}</Text>
      <Text style={styles.sub}>Tap them in order</Text>
      <View style={styles.list}>
        {card.items.map((it, i) => {
          const pos = order.indexOf(i);
          const right = done && card.correct[pos] === i;
          return (
            <Pressable
              key={it.name}
              onPress={() => tap(i)}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.85 },
                done && { borderColor: right ? colors.good : colors.bad },
              ]}
            >
              <View style={[styles.badge, pos >= 0 && { backgroundColor: accent }]}>
                <Text style={[styles.badgeText, pos >= 0 && { color: '#111' }]}>{pos >= 0 ? pos + 1 : ''}</Text>
              </View>
              <Text style={styles.emoji}>{it.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {it.name}
                </Text>
                {done && (
                  <Text style={styles.value}>
                    {it.display}
                    {!right ? `  ·  should be #${card.correct.indexOf(i) + 1}` : ''}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      {done && (
        <Result
          ok={correctCount === card.items.length}
          title={correctCount === card.items.length ? 'Perfect order!' : `${correctCount} of ${card.items.length} in the right spot`}
        />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 15, marginTop: 4, marginBottom: 18 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  emoji: { fontSize: 28 },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  value: { color: colors.textDim, fontSize: 14, fontWeight: '600', marginTop: 2 },
});
