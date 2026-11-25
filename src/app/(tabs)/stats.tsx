import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Category } from '../../cards/types';
import { useStats } from '../../store/stats';
import { useDaily } from '../../store/daily';
import { getLevel } from '../../store/progress';
import { seenCount } from '../../store/seenFacts';
import { reviewCounts } from '../../store/reviews';
import { useSaved } from '../../store/saved';
import { GAME_NAMES, type PuzzleKind } from '../../feed/puzzleFactory';
import { categoryTheme, colors } from '../../theme';

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

/** Your brain profile: totals, accuracy per category and your level in every game. */
export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const stats = useStats();
  const daily = useDaily();
  const savedCount = useSaved((s) => s.facts.length);
  const [, refresh] = useState(0);
  // Levels and counters aren't reactive: re-read them whenever this tab opens.
  useFocusEffect(useCallback(() => refresh((n) => n + 1), []));

  const reviews = reviewCounts();
  const accuracy = stats.puzzlesAnswered ? Math.round((stats.puzzlesCorrect / stats.puzzlesAnswered) * 100) : 0;
  const cats = (Object.keys(categoryTheme) as Category[])
    .map((c) => ({ c, s: stats.byCategory[c] }))
    .filter((x) => x.s && x.s.answered > 0)
    .sort((a, b) => b.s!.answered - a.s!.answered);
  const games = (Object.keys(GAME_NAMES) as PuzzleKind[])
    .map((k) => ({ k, level: getLevel(k) }))
    .sort((a, b) => b.level - a.level || GAME_NAMES[a.k].localeCompare(GAME_NAMES[b.k]));

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Your brain</Text>

      <View style={styles.tiles}>
        <Tile value={seenCount()} label="facts read" />
        <Tile value={stats.puzzlesCorrect} label="puzzles solved" />
        <Tile value={`${accuracy}%`} label="right answers" />
        <Tile value={stats.bestStreak} label="best streak" />
        <Tile value={`${daily.streak} 🔥`} label="daily streak" />
        <Tile value={reviews.learned} label="facts learned" />
      </View>
      <Text style={styles.note}>
        {savedCount} saved · {reviews.scheduled} facts in your review queue{reviews.due ? ` (${reviews.due} due now)` : ''}
      </Text>

      <Text style={styles.h2}>By topic</Text>
      {cats.length === 0 && <Text style={styles.note}>Answer some puzzles to see your profile.</Text>}
      {cats.map(({ c, s }) => {
        const pct = Math.round((s!.correct / s!.answered) * 100);
        const theme = categoryTheme[c];
        return (
          <View key={c} style={styles.catRow}>
            <View style={styles.catHead}>
              <Text style={styles.catName}>{theme.label}</Text>
              <Text style={styles.catPct}>
                {pct}% · {s!.answered}
              </Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: theme.accent }]} />
            </View>
          </View>
        );
      })}

      <Text style={styles.h2}>Game levels</Text>
      <View style={styles.games}>
        {games.map(({ k, level }) => (
          <View key={k} style={styles.gameRow}>
            <Text style={styles.gameName}>{GAME_NAMES[k]}</Text>
            <View style={styles.levelDots}>
              {Array.from({ length: 11 }, (_, i) => (
                <View key={i} style={[styles.levelDot, i <= level && { backgroundColor: colors.text }]} />
              ))}
            </View>
            <Text style={styles.gameLevel}>LV {level + 1}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 16 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', backgroundColor: colors.surface, borderRadius: 16, padding: 12, gap: 2 },
  tileValue: { color: colors.text, fontSize: 24, fontWeight: '900' },
  tileLabel: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  note: { color: colors.textDim, fontSize: 13, marginTop: 10 },
  h2: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 28, marginBottom: 12 },
  catRow: { marginBottom: 12, gap: 6 },
  catHead: { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  catPct: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  games: { gap: 10 },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gameName: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  levelDots: { flexDirection: 'row', gap: 3 },
  levelDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfaceStrong },
  gameLevel: { color: colors.textDim, fontSize: 12, fontWeight: '800', width: 40, textAlign: 'right' },
});
