import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { CountryHuntCardData, Country } from './types';
import { CardShell } from './CardShell';
import { Result } from '../ui/Buttons';
import { LetterKeyboard } from '../ui/LetterKeyboard';
import { answered, tick } from '../ui/feedback';
import { COUNTRIES } from '../data';
import { directionArrow, distanceKm } from '../puzzles/mind';
import { flagEmoji } from '../lib/format';
import { categoryTheme, colors } from '../theme';

const MAX_GUESSES = 6;
const MAX_KM = 20000;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');

/** Guess the mystery country; each guess tells you how far away and in which direction. */
export const CountryHuntCard = memo(function CountryHuntCard({ card, height }: { card: CountryHuntCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const target = useMemo(() => COUNTRIES.find((c) => c.iso2 === card.iso2)!, [card.iso2]);
  const [query, setQuery] = useState('');
  const [guesses, setGuesses] = useState<Country[]>([]);
  const won = guesses.some((g) => g.iso2 === target.iso2);
  const over = won || guesses.length >= MAX_GUESSES;

  const suggestions = useMemo(() => {
    if (!query) return [];
    const q = norm(query);
    const starts = COUNTRIES.filter((c) => norm(c.name).startsWith(q));
    const contains = COUNTRIES.filter((c) => !norm(c.name).startsWith(q) && norm(c.name).includes(q));
    return [...starts, ...contains].filter((c) => !guesses.includes(c)).slice(0, 3);
  }, [query, guesses]);

  const guess = (c: Country) => {
    const next = [...guesses, c];
    setGuesses(next);
    setQuery('');
    if (c.iso2 === target.iso2) answered(card, true);
    else if (next.length >= MAX_GUESSES) answered(card, false);
  };

  const press = (k: string) => {
    if (over) return;
    if (k === '⌫') return setQuery((q) => q.slice(0, -1));
    if (k === '⏎') return;
    tick();
    setQuery((q) => (q.length < 24 ? q + k : q));
  };
  const pressRef = useRef(press);
  pressRef.current = press;
  const onKey = useCallback((k: string) => pressRef.current(k), []);

  return (
    <CardShell category={card.category} level={card.level} label="Country hunt" height={height}>
      <Text style={styles.prompt}>Find the mystery country</Text>
      <Text style={styles.sub}>Each guess shows the distance and direction. {MAX_GUESSES - guesses.length} guesses left.</Text>
      <View style={styles.list}>
        {guesses.map((g) => {
          const hit = g.iso2 === target.iso2;
          const km = hit ? 0 : distanceKm(g.lat ?? 0, g.lon ?? 0, target.lat ?? 0, target.lon ?? 0);
          const close = Math.max(0, Math.round(100 - (km / MAX_KM) * 100));
          return (
            <Animated.View key={g.iso2} entering={FadeInDown} style={[styles.row, hit && { borderColor: colors.good }]}>
              <Text style={styles.flag}>{flagEmoji(g.iso2)}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {g.name}
              </Text>
              <Text style={styles.km}>{hit ? '🎯' : `${Math.round(km).toLocaleString('en-US')} km`}</Text>
              <Text style={styles.dir}>{hit ? '' : directionArrow(g.lat ?? 0, g.lon ?? 0, target.lat ?? 0, target.lon ?? 0)}</Text>
              <View style={[styles.heat, { backgroundColor: close > 90 ? colors.good : close > 70 ? '#FFD43B' : colors.surfaceStrong }]}>
                <Text style={styles.heatText}>{close}%</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
      {over ? (
        <Result
          ok={won}
          title={won ? `Found it in ${guesses.length}!` : `It was ${target.name} ${flagEmoji(target.iso2)}`}
          text={target.capital ? `Capital: ${target.capital}.` : undefined}
        />
      ) : (
        <View style={styles.inputArea}>
          <View style={[styles.input, { borderColor: query ? accent : colors.border }]}>
            <Text style={[styles.inputText, !query && { color: colors.textDim }]}>{query || 'Type a country…'}</Text>
          </View>
          <View style={styles.suggestions}>
            {suggestions.map((c) => (
              <Pressable key={c.iso2} onPress={() => guess(c)} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}>
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {flagEmoji(c.iso2)} {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <LetterKeyboard onKey={onKey} showEnter={false} />
        </View>
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 14, marginTop: 4, marginBottom: 10 },
  list: { gap: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  flag: { fontSize: 22 },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  km: { color: colors.text, fontSize: 14, fontWeight: '700' },
  dir: { fontSize: 18, width: 24, textAlign: 'center' },
  heat: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, minWidth: 44, alignItems: 'center' },
  heatText: { color: '#111', fontSize: 12, fontWeight: '800' },
  inputArea: { marginTop: 10, gap: 8 },
  input: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  inputText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  suggestions: { flexDirection: 'row', gap: 6, minHeight: 40 },
  suggestion: { flex: 1, backgroundColor: colors.surfaceStrong, borderRadius: 10, paddingHorizontal: 8, justifyContent: 'center' },
  suggestionText: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
