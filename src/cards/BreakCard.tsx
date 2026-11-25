import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BreakCardData } from './types';
import { CardShell } from './CardShell';
import { colors } from '../theme';

/** Gentle reminder after a while of scrolling (can be switched off in Settings). */
export const BreakCard = memo(function BreakCard({ card, height }: { card: BreakCardData; height: number }) {
  return (
    <CardShell category={card.category} label="Time check" height={height}>
      <View style={styles.wrap}>
        <Text style={styles.emoji}>🌿</Text>
        <Text style={styles.title}>You’ve been scrolling for {card.minutes} minutes</Text>
        <Text style={styles.text}>
          Your brain learns best with breaks. Maybe stretch, drink some water, or tell someone the best fact you just
          learned.
        </Text>
        <Text style={styles.hint}>Swipe up if you want to keep going.</Text>
      </View>
    </CardShell>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  emoji: { fontSize: 64 },
  title: { color: colors.text, fontSize: 28, lineHeight: 35, fontWeight: '800' },
  text: { color: colors.textDim, fontSize: 18, lineHeight: 26 },
  hint: { color: colors.textDim, fontSize: 14, marginTop: 10 },
});
