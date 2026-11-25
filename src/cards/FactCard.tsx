import { memo, useEffect } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { FactCardData } from './types';
import { CardShell } from './CardShell';
import { sourceUrl } from '../lib/format';
import { markFactSeen } from '../store/seenFacts';
import { useSaved } from '../store/saved';
import { engagement } from '../store/engagement';
import { scheduleReview } from '../store/reviews';
import { tick } from '../ui/feedback';
import { Ionicons } from '@expo/vector-icons';
import { categoryTheme, colors } from '../theme';

type Props = { card: FactCardData; active: boolean; height: number };

export const FactCard = memo(function FactCard({ card, active, height }: Props) {
  const { fact } = card;
  const accent = categoryTheme[card.category].accent;

  // Fade the "use it" box in the first time the card becomes active.
  const reveal = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    reveal.value = withDelay(350, withTiming(1, { duration: 450 }));
    markFactSeen(fact.id);
  }, [active, reveal, fact.id]);
  const useItStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 14 }],
  }));

  const url = sourceUrl(fact.source);
  const saved = useSaved((s) => s.facts.some((f) => f.id === fact.id));
  const toggleSave = () => {
    tick();
    if (useSaved.getState().toggle(fact)) {
      engagement.saved('fact', card.category);
      if (!fact.id.startsWith('useless-')) scheduleReview(fact.id);
    }
  };

  return (
    <CardShell
      category={card.category}
      label={card.label}
      height={height}
      footer={
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.action, saved && { backgroundColor: accent + '33' }, pressed && styles.pressed]}
            onPress={toggleSave}
          >
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={17} color={saved ? accent : colors.text} />
            <Text style={styles.actionText}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={() => Share.share({ message: `${fact.text}\n\n${url}` })}
          >
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={() => Linking.openURL(url)}
          >
            <Text style={styles.actionText}>Source</Text>
          </Pressable>
        </View>
      }
    >
      <Text style={styles.fact}>{fact.text}</Text>
      {fact.useIt ? (
        <Animated.View style={[styles.useIt, { borderLeftColor: accent }, useItStyle]}>
          <Text style={[styles.useItLabel, { color: accent }]}>USE IT</Text>
          <Text style={styles.useItText}>{fact.useIt}</Text>
        </Animated.View>
      ) : null}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  fact: { color: colors.text, fontSize: 27, lineHeight: 37, fontWeight: '700', letterSpacing: -0.3 },
  useIt: {
    marginTop: 28,
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 4,
    gap: 4,
  },
  useItLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  useItText: { color: colors.textDim, fontSize: 16, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  pressed: { backgroundColor: colors.surfaceStrong, transform: [{ scale: 0.97 }] },
  actionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
