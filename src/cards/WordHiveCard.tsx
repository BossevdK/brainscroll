import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { WordHiveCardData } from './types';
import { CardShell } from './CardShell';
import { tick, answered } from '../ui/feedback';
import { shuffle, createRng } from '../lib/rng';
import { categoryTheme, colors } from '../theme';

const RANKS = [
  [0, 'Warming up'],
  [0.1, 'Good start'],
  [0.25, 'Solid'],
  [0.4, 'Nice'],
  [0.6, 'Great'],
  [0.8, 'Amazing'],
  [1, 'Word wizard'],
] as const;

const isPangram = (w: string) => new Set(w).size === 7;
const points = (w: string) => (w.length === 4 ? 1 : w.length) + (isPangram(w) ? 7 : 0);

const HexButton = memo(function HexButton({
  l,
  center,
  accent,
  onAdd,
}: {
  l: string;
  center?: boolean;
  accent: string;
  onAdd: (l: string) => void;
}) {
  return (
    <Pressable
      onPressIn={() => onAdd(l)}
      style={({ pressed }) => [styles.hex, center && { backgroundColor: accent }, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <Text style={[styles.hexText, center && { color: '#111' }]}>{l.toUpperCase()}</Text>
    </Pressable>
  );
});

/** Make words from 7 letters; every word must use the middle letter. */
export const WordHiveCard = memo(function WordHiveCard({ card, height }: { card: WordHiveCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const [outer, setOuter] = useState(card.letters.split(''));
  const [word, setWord] = useState('');
  const [found, setFound] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [rewarded, setRewarded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const max = useMemo(() => card.words.reduce((s, w) => s + points(w), 0), [card.words]);
  const score = found.reduce((s, w) => s + points(w), 0);
  const rank = [...RANKS].reverse().find(([f]) => score >= f * max)![1];

  const add = useCallback((l: string) => {
    tick();
    setMessage('');
    setWord((w) => (w.length < 12 ? w + l : w));
  }, []);

  const enter = () => {
    const w = word;
    setWord('');
    if (w.length < 4) return setMessage('Too short (4+ letters)');
    if (!w.includes(card.center)) return setMessage(`Must use the middle letter ${card.center.toUpperCase()}`);
    if (found.includes(w)) return setMessage('Already found');
    if (!card.words.includes(w)) return setMessage('Not in our list');
    const f = [w, ...found];
    setFound(f);
    setMessage(isPangram(w) ? '🎉 Uses every letter! +7' : `+${points(w)}`);
    // Counts as "solved" once you reach the "Nice" rank.
    const newScore = score + points(w);
    if (!rewarded && newScore >= 0.4 * max) {
      setRewarded(true);
      answered(card, true);
    }
  };

  return (
    <CardShell category={card.category} level={card.level} label="Word hive" height={height}>
      <View style={styles.header}>
        <Text style={styles.rank}>{rank}</Text>
        <Text style={styles.score}>
          {score} pts · {found.length}/{card.words.length} words
        </Text>
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${Math.min(100, (score / max) * 100)}%`, backgroundColor: accent }]} />
      </View>
      <Text style={styles.found} numberOfLines={2}>
        {showAll
          ? card.words.map((w) => (found.includes(w) ? w : `(${w})`)).join(' · ')
          : found.length
            ? found.join(' · ')
            : 'Your words appear here'}
      </Text>

      <Text style={styles.word}>
        {word
          ? word.split('').map((l, i) => (
              <Text key={i} style={l === card.center ? { color: accent } : undefined}>
                {l.toUpperCase()}
              </Text>
            ))
          : ' '}
      </Text>
      <Text style={styles.message}>{message || ' '}</Text>

      <View style={styles.hive}>
        <View style={styles.hiveRow}>
          {outer.slice(0, 3).map((l) => (
            <HexButton key={l} l={l} accent={accent} onAdd={add} />
          ))}
        </View>
        <View style={styles.hiveRow}>
          <HexButton l={card.center} center accent={accent} onAdd={add} />
        </View>
        <View style={styles.hiveRow}>
          {outer.slice(3).map((l) => (
            <HexButton key={l} l={l} accent={accent} onAdd={add} />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => setWord((w) => w.slice(0, -1))} style={styles.action}>
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
        <Pressable onPress={() => setOuter((o) => shuffle(createRng(Date.now()), o))} style={styles.action}>
          <Text style={styles.actionText}>⟳</Text>
        </Pressable>
        <Pressable onPress={enter} style={[styles.action, { backgroundColor: accent }]}>
          <Text style={[styles.actionText, { color: '#111' }]}>Enter</Text>
        </Pressable>
      </View>
      {!showAll && (
        <Pressable onPress={() => setShowAll(true)} style={styles.reveal}>
          <Text style={styles.revealText}>Show all words</Text>
        </Pressable>
      )}
    </CardShell>
  );
});

const HEX = 64;
const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rank: { color: colors.text, fontSize: 22, fontWeight: '800' },
  score: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceStrong, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 6 },
  found: { color: colors.textDim, fontSize: 14, marginTop: 10, minHeight: 38 },
  word: { color: colors.text, fontSize: 32, fontWeight: '900', textAlign: 'center', marginTop: 8, letterSpacing: 2 },
  message: { color: colors.textDim, fontSize: 14, textAlign: 'center', marginBottom: 6 },
  hive: { alignItems: 'center', gap: 6 },
  hiveRow: { flexDirection: 'row', gap: 10 },
  hex: {
    width: HEX,
    height: HEX,
    borderRadius: 20,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexText: { color: colors.text, fontSize: 26, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 16 },
  action: { backgroundColor: colors.surfaceStrong, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  actionText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  reveal: { alignSelf: 'center', marginTop: 10, padding: 4 },
  revealText: { color: colors.textDim, fontSize: 13, textDecorationLine: 'underline' },
});
