import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { WordGuessCardData } from './types';
import { CardShell } from './CardShell';
import { Result } from '../ui/Buttons';
import { LetterKeyboard } from '../ui/LetterKeyboard';
import { answered, tick } from '../ui/feedback';
import { isValidWord } from '../data';
import { scoreGuess, type LetterScore } from '../puzzles/brain';
import { colors } from '../theme';

const ROWS = 6;
const LEN = 5;
const TILE: Record<LetterScore, string> = { hit: '#3DAA6B', present: '#C9A227', miss: '#3A3B44' };

export const WordGuessCard = memo(function WordGuessCard({ card, height }: { card: WordGuessCardData; height: number }) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState('');
  const shake = useSharedValue(0);

  const won = guesses.includes(card.answer);
  const over = won || guesses.length >= ROWS;

  // Only recomputed after a guess is submitted, not on every key press.
  const keyState = useMemo(() => {
    const ks: Record<string, LetterScore> = {};
    for (const g of guesses) {
      scoreGuess(g, card.answer).forEach((s, i) => {
        const prev = ks[g[i]];
        if (s === 'hit' || (s === 'present' && prev !== 'hit') || (!prev && s === 'miss')) ks[g[i]] = s;
      });
    }
    return ks;
  }, [guesses, card.answer]);
  const keyColors = useMemo(
    () => Object.fromEntries(Object.entries(keyState).map(([k, v]) => [k, TILE[v]])),
    [keyState],
  );

  const submit = () => {
    if (current.length < LEN) {
      setMessage('Not enough letters');
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 }));
      return;
    }
    if (current !== card.answer && !isValidWord(current)) {
      setMessage('Not in the word list');
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 }));
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent('');
    setMessage('');
    if (current === card.answer) answered(card, true);
    else if (next.length >= ROWS) answered(card, false);
  };

  const press = (k: string) => {
    if (over) return;
    if (k === '⏎') return submit();
    if (k === '⌫') return setCurrent((c) => c.slice(0, -1));
    tick();
    // Functional update: fast typing never loses a letter.
    setCurrent((c) => (c.length < LEN ? c + k : c));
    if (message) setMessage('');
  };
  // Stable callback for the memoized keys; always calls the latest `press`.
  const pressRef = useRef(press);
  pressRef.current = press;
  const onKey = useCallback((k: string) => pressRef.current(k), []);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <CardShell category={card.category} level={card.level} label="Word guess" height={height}>
      <View style={styles.grid}>
        {Array.from({ length: ROWS }).map((_, r) => {
          const g = guesses[r];
          const scores = g ? scoreGuess(g, card.answer) : null;
          const letters = g ?? (r === guesses.length ? current : '');
          const row = (
            <View key={r} style={styles.gridRow}>
              {Array.from({ length: LEN }).map((__, c) => (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    scores && { backgroundColor: TILE[scores[c]], borderColor: TILE[scores[c]] },
                    !scores && letters[c] && { borderColor: colors.textDim },
                  ]}
                >
                  <Text style={styles.cellText}>{(letters[c] ?? '').toUpperCase()}</Text>
                </View>
              ))}
            </View>
          );
          return r === guesses.length ? (
            <Animated.View key={r} style={shakeStyle}>
              {row}
            </Animated.View>
          ) : (
            row
          );
        })}
      </View>
      <Text style={styles.message}>{message || ' '}</Text>
      {over ? (
        <Result
          ok={won}
          title={won ? `Got it in ${guesses.length}!` : `The word was ${card.answer.toUpperCase()}`}
        />
      ) : (
        <LetterKeyboard onKey={onKey} colorsByKey={keyColors} />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  grid: { gap: 5, alignItems: 'center' },
  gridRow: { flexDirection: 'row', gap: 5 },
  cell: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { color: colors.text, fontSize: 26, fontWeight: '900' },
  message: { color: colors.textDim, textAlign: 'center', fontSize: 14, marginVertical: 8 },
});
