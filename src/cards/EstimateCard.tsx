import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import type { EstimateCardData } from './types';
import { CardShell } from './CardShell';
import { PrimaryButton, Result } from '../ui/Buttons';
import { Slider } from '../ui/Slider';
import { answered } from '../ui/feedback';
import { setById } from '../data';
import { estimateScore } from '../puzzles/quantity';
import { categoryTheme, colors } from '../theme';

const RATINGS = ['Way off', 'Not bad', 'Close!', 'Spot on!'];

export const EstimateCard = memo(function EstimateCard({ card, height }: { card: EstimateCardData; height: number }) {
  const set = setById(card.setId);
  const accent = categoryTheme[card.category].accent;
  const fromSlider = (v: number) =>
    card.log ? card.min * (card.max / card.min) ** v : Math.round(card.min + v * (card.max - card.min));

  const slider = useSharedValue(0.5);
  const [guess, setGuess] = useState(() => fromSlider(0.5));
  const [score, setScore] = useState<number | null>(null);

  return (
    <CardShell category={card.category} level={card.level} label="Estimate" height={height}>
      <Text style={styles.emoji}>{card.emoji}</Text>
      <Text style={styles.question}>{card.question}</Text>
      <Text style={[styles.value, { color: accent }]}>{set.format(guess)}</Text>
      {score === null ? (
        <View style={styles.controls}>
          <Slider value={slider} accent={accent} onChange={(v) => setGuess(fromSlider(v))} />
          <View style={styles.range}>
            <Text style={styles.rangeText}>{set.format(card.min)}</Text>
            <Text style={styles.rangeText}>{set.format(card.max)}</Text>
          </View>
          <PrimaryButton
            label="Lock it in"
            accent={accent}
            onPress={() => {
              const s = estimateScore(card.isYear, guess, card.answer);
              setScore(s);
              answered(card, s >= 2);
            }}
          />
        </View>
      ) : (
        <Result ok={score >= 2} title={RATINGS[score]} text={`The answer: ${card.answerDisplay}.`} />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  emoji: { fontSize: 64, marginBottom: 6 },
  question: { color: colors.text, fontSize: 26, lineHeight: 33, fontWeight: '800' },
  value: { fontSize: 34, fontWeight: '900', marginVertical: 22 },
  controls: { gap: 10 },
  range: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6, marginBottom: 6 },
  rangeText: { color: colors.textDim, fontSize: 12 },
});
