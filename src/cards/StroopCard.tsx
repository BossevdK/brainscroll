import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { StroopCardData } from './types';
import { CardShell } from './CardShell';
import { PrimaryButton, Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { STROOP_COLORS, makeStroopTrial } from '../puzzles/mind';
import { createRng } from '../lib/rng';
import { categoryTheme, colors } from '../theme';

const SECONDS = 20;

/** Tap the INK colour, not the word. Trains focus and self-control (the Stroop effect). */
export const StroopCard = memo(function StroopCard({
  card,
  active,
  height,
}: {
  card: StroopCardData;
  active: boolean;
  height: number;
}) {
  const accent = categoryTheme[card.category].accent;
  const rng = useMemo(() => createRng(card.seed), [card.seed]);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [trial, setTrial] = useState(() => makeStroopTrial(rng));
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(1);

  const finish = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPhase('done');
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    if (!active && phase === 'running') finish();
  }, [active, phase]);
  useEffect(() => {
    if (phase === 'done') answered(card, score >= 12 && misses <= 3);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setPhase('running');
    progress.value = 1;
    progress.value = withTiming(0, { duration: SECONDS * 1000, easing: Easing.linear });
    timer.current = setTimeout(finish, SECONDS * 1000);
  };

  const pick = (i: number) => {
    if (phase !== 'running') return;
    if (i === trial.ink) {
      tick();
      setScore((s) => s + 1);
      setFlash(false);
    } else {
      setMisses((m) => m + 1);
      setFlash(true);
    }
    setTrial(makeStroopTrial(rng));
  };

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <CardShell category={card.category} level={card.level} label="Color clash" height={height}>
      {phase === 'idle' && (
        <View style={{ gap: 14 }}>
          <Text style={[styles.word, { color: STROOP_COLORS[1].hex, textAlign: 'left' }]}>RED</Text>
          <Text style={styles.title}>Tap the colour of the ink, not the word.</Text>
          <Text style={styles.sub}>Above, the right answer is BLUE. You have {SECONDS} seconds.</Text>
          <PrimaryButton label="Start" accent={accent} onPress={start} />
        </View>
      )}
      {phase === 'running' && (
        <View>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.bar, { backgroundColor: accent }, barStyle]} />
          </View>
          <Text style={styles.count}>
            {score} right{flash ? '  ·  oops!' : ''}
          </Text>
          <Text style={[styles.word, { color: STROOP_COLORS[trial.ink].hex }]}>{STROOP_COLORS[trial.word].name}</Text>
          <View style={styles.buttons}>
            {STROOP_COLORS.map((c, i) => (
              <Pressable
                key={c.name}
                onPressIn={() => pick(i)}
                style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.btnText}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {phase === 'done' && (
        <Result
          ok={score >= 12 && misses <= 3}
          title={`${score} right, ${misses} wrong`}
          text={score >= 20 ? 'Laser focus!' : score >= 12 ? 'Your brain beat the word.' : 'Tricky, right? Your brain reads the word before it sees the colour.'}
        />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 16, lineHeight: 22 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  bar: { height: 6 },
  count: { color: colors.textDim, fontSize: 15, fontWeight: '700', marginTop: 10 },
  word: { fontSize: 64, fontWeight: '900', textAlign: 'center', marginVertical: 36, letterSpacing: 2 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    width: '48%',
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
});
