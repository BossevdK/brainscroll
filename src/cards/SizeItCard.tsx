import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SizeItCardData } from './types';
import { CardShell } from './CardShell';
import { PrimaryButton, Result } from '../ui/Buttons';
import { Slider } from '../ui/Slider';
import { answered } from '../ui/feedback';
import { setById } from '../data';
import { estimateScore } from '../puzzles/quantity';
import { categoryTheme, colors } from '../theme';

// The guess is a ratio target/reference between MIN_R and MAX_R.
const MIN_R = 0.1;
const MAX_R = 5;
// Used inside animated styles, so these must be worklets (they run on the UI thread).
const toRatio = (v: number) => {
  'worklet';
  return MIN_R + v * (MAX_R - MIN_R);
};
const toSlider = (r: number) => {
  'worklet';
  return (r - MIN_R) / (MAX_R - MIN_R);
};

const RATINGS = ['Way off', 'Not bad', 'Close!', 'Spot on!'];

/**
 * "Size it": the reference is drawn at a fixed size; slide to make the other one
 * as big as you think it really is. Bars for heights/lengths, circles for planets.
 */
export const SizeItCard = memo(function SizeItCard({ card, height }: { card: SizeItCardData; height: number }) {
  const set = setById(card.setId);
  const accent = categoryTheme[card.category].accent;
  const round = card.sizeWord === 'wide';
  const trueRatio = card.target.value / card.reference.value;

  const slider = useSharedValue(toSlider(1));
  const reveal = useSharedValue(0);
  const [guessRatio, setGuessRatio] = useState(1);
  const [done, setDone] = useState<null | number>(null); // score 0..3

  const [area, setArea] = useState({ w: 0, h: 0 });
  // Size of "1×" in pixels; 5× must still fit in the area.
  const unit = round ? Math.min(area.w / 2 - 12, area.h) / MAX_R : area.h / MAX_R;

  const guessStyle = useAnimatedStyle(() => {
    const s = toRatio(slider.value) * unit;
    return round ? { width: s, height: s, borderRadius: s / 2 } : { height: s };
  });
  const truthStyle = useAnimatedStyle(() => {
    const s = trueRatio * unit;
    return round
      ? { width: s, height: s, borderRadius: s / 2, opacity: reveal.value }
      : { height: s * reveal.value, opacity: reveal.value };
  });

  const refSize = unit;
  const guessValue = card.reference.value * guessRatio;

  const lock = () => {
    const score = estimateScore(false, guessValue, card.target.value);
    setDone(score);
    reveal.value = withTiming(1, { duration: 600 });
    answered(card, score >= 2);
  };

  return (
    <CardShell category={card.category} level={card.level} label="Size it" height={height}>
      <Text style={styles.question}>
        How {card.sizeWord} is {card.target.name} compared to {card.reference.name}?
      </Text>

      <View style={styles.area} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {unit > 0 && (
          <View style={styles.columns}>
            <View style={styles.column}>
              <View
                style={[
                  styles.shape,
                  !round && styles.bar,
                  { backgroundColor: colors.surfaceStrong, borderColor: colors.textDim },
                  round ? { width: refSize, height: refSize, borderRadius: refSize / 2 } : { height: refSize },
                ]}
              />
            </View>
            <View style={styles.column}>
              <View style={styles.stack}>
                <Animated.View
                  style={[styles.shape, !round && styles.bar, { backgroundColor: accent + '55', borderColor: accent }, guessStyle]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[styles.shape, !round && styles.bar, styles.truth, { borderColor: colors.good }, truthStyle]}
                />
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.labels}>
        <View style={styles.label}>
          <Text style={styles.labelName} numberOfLines={2}>
            {card.reference.emoji} {card.reference.name}
          </Text>
          <Text style={styles.labelValue}>{card.reference.display}</Text>
        </View>
        <View style={styles.label}>
          <Text style={styles.labelName} numberOfLines={2}>
            {card.target.emoji} {card.target.name}
          </Text>
          <Text style={[styles.labelValue, { color: accent }]}>
            {done === null ? `≈ ${set.format(guessValue)}` : card.target.display}
          </Text>
        </View>
      </View>

      {done === null ? (
        <View style={styles.controls}>
          <Slider value={slider} accent={accent} onChange={(v) => setGuessRatio(toRatio(v))} />
          <PrimaryButton label="Lock it in" accent={accent} onPress={lock} />
        </View>
      ) : (
        <Result
          ok={done >= 2}
          title={RATINGS[done]}
          text={`You guessed ${set.format(guessValue)}; it's actually ${card.target.display} (${trueRatio >= 1 ? trueRatio.toFixed(1) + '×' : '1/' + (1 / trueRatio).toFixed(1)} the size of ${card.reference.name}).`}
        />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  question: { color: colors.text, fontSize: 22, lineHeight: 29, fontWeight: '800' },
  area: { flex: 1, minHeight: 160, marginTop: 12 },
  columns: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  stack: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  shape: { borderWidth: 2 },
  bar: { width: '62%', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  truth: { position: 'absolute', bottom: 0, borderStyle: 'dashed', borderWidth: 3, backgroundColor: 'transparent' },
  labels: { flexDirection: 'row', gap: 12, marginTop: 10 },
  label: { flex: 1, alignItems: 'center', gap: 2 },
  labelName: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  labelValue: { color: colors.textDim, fontSize: 15, fontWeight: '700' },
  controls: { gap: 12, marginTop: 14 },
});
