import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { QuickMathCardData } from './types';
import { CardShell } from './CardShell';
import { PrimaryButton, Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { makeMathQuestion } from '../puzzles/brain';
import { createRng } from '../lib/rng';
import { categoryTheme, colors } from '../theme';

const SECONDS = 20;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', '0', '⌫'];

export const QuickMathCard = memo(function QuickMathCard({
  card,
  active,
  height,
}: {
  card: QuickMathCardData;
  active: boolean;
  height: number;
}) {
  const accent = categoryTheme[card.category].accent;
  const rng = useMemo(() => createRng(card.seed), [card.seed]);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [q, setQ] = useState(() => makeMathQuestion(rng, card.difficulty));
  const [input, setInput] = useState('');
  const [solved, setSolved] = useState(0);
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

  // Swiping away ends the sprint.
  useEffect(() => {
    if (!active && phase === 'running') finish();
  }, [active, phase]);

  useEffect(() => {
    if (phase === 'done') answered(card, solved >= 8);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setPhase('running');
    progress.value = 1;
    progress.value = withTiming(0, { duration: SECONDS * 1000, easing: Easing.linear });
    timer.current = setTimeout(finish, SECONDS * 1000);
  };

  const press = (k: string) => {
    if (phase !== 'running') return;
    if (k === '⌫') return setInput((s) => s.slice(0, -1));
    if (k === 'skip') {
      setInput('');
      setQ(makeMathQuestion(rng, card.difficulty));
      return;
    }
    const next = (input + k).slice(0, 4);
    if (Number(next) === q.answer) {
      tick();
      setSolved((n) => n + 1);
      setInput('');
      setQ(makeMathQuestion(rng, card.difficulty));
    } else {
      setInput(next);
    }
  };

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <CardShell category={card.category} level={card.level} label="Quick math" height={height}>
      {phase === 'idle' && (
        <View style={styles.center}>
          <Text style={styles.big}>⏱️</Text>
          <Text style={styles.title}>{SECONDS}-second sprint</Text>
          <Text style={styles.sub}>Solve as many sums as you can. Answers count as soon as they're right.</Text>
          <PrimaryButton label="Start" accent={accent} onPress={start} />
        </View>
      )}
      {phase === 'running' && (
        <View>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.bar, { backgroundColor: accent }, barStyle]} />
          </View>
          <Text style={styles.solved}>{solved} solved</Text>
          <Text style={styles.sum}>{q.text}</Text>
          <Text style={[styles.input, { color: accent }]}>{input || ' '}</Text>
          <View style={styles.pad}>
            {KEYS.map((k) => (
              <Pressable key={k} onPressIn={() => press(k)} style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
                <Text style={[styles.keyText, k === 'skip' && { fontSize: 15 }]}>{k}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {phase === 'done' && (
        <View>
          <Text style={styles.big}>🧮</Text>
          <Result
            ok={solved >= 8}
            title={`${solved} sums in ${SECONDS} seconds`}
            text={solved >= 15 ? 'Calculator brain!' : solved >= 8 ? 'Nice and quick.' : 'Warm-up done. Next time faster!'}
          />
        </View>
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  center: { gap: 14 },
  big: { fontSize: 56 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 16, lineHeight: 22, marginBottom: 8 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  bar: { height: 6 },
  solved: { color: colors.textDim, fontSize: 15, fontWeight: '700', marginTop: 10 },
  sum: { color: colors.text, fontSize: 48, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  input: { fontSize: 40, fontWeight: '900', textAlign: 'center', marginVertical: 8, minHeight: 50 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  key: {
    width: '31.5%',
    height: 58,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.surfaceStrong },
  keyText: { color: colors.text, fontSize: 24, fontWeight: '700' },
});
