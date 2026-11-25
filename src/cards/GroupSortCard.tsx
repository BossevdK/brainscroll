import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { GroupSortCardData } from './types';
import { CardShell } from './CardShell';
import { PrimaryButton, Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { categoryTheme, colors } from '../theme';

const GROUP_COLORS = ['#FFD43B', '#3DDC84', '#4D9DFF', '#C084FC'];
const MAX_MISTAKES = 4;

/** 16 words, 4 hidden groups of 4. Pick four that belong together. */
export const GroupSortCard = memo(function GroupSortCard({ card, height }: { card: GroupSortCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const [solved, setSolved] = useState<number[]>([]); // group indices, in solve order
  const [selected, setSelected] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState('');
  const lost = mistakes >= MAX_MISTAKES;
  const won = solved.length === 4;
  const over = won || lost;

  const groupOf = (w: string) => card.groups.findIndex((g) => g.words.includes(w));
  const remaining = card.tiles.filter((t) => !solved.includes(groupOf(t)));

  const toggle = (w: string) => {
    if (over) return;
    tick();
    setMessage('');
    setSelected((s) => (s.includes(w) ? s.filter((x) => x !== w) : s.length < 4 ? [...s, w] : s));
  };

  const submit = () => {
    const g = groupOf(selected[0]);
    if (selected.every((w) => groupOf(w) === g)) {
      const s = [...solved, g];
      setSolved(s);
      setSelected([]);
      if (s.length === 4) answered(card, mistakes <= 2);
      return;
    }
    const counts = card.groups.map((_, gi) => selected.filter((w) => groupOf(w) === gi).length);
    setMessage(Math.max(...counts) === 3 ? 'One away…' : 'Not a group');
    const m = mistakes + 1;
    setMistakes(m);
    if (m >= MAX_MISTAKES) {
      setSolved([...solved, ...card.groups.map((_, i) => i).filter((i) => !solved.includes(i))]);
      setSelected([]);
      answered(card, false);
    }
  };

  return (
    <CardShell category={card.category} level={card.level} label="Group sort" height={height}>
      <Text style={styles.prompt}>Find 4 groups of 4</Text>
      <Text style={styles.sub}>
        Mistakes left: {'●'.repeat(MAX_MISTAKES - mistakes)}
        {'○'.repeat(mistakes)}
      </Text>
      <View style={styles.board}>
        {solved.map((gi) => (
          <Animated.View key={gi} entering={FadeIn} style={[styles.solved, { backgroundColor: GROUP_COLORS[solved.indexOf(gi)] }]}>
            <Text style={styles.solvedLabel}>{card.groups[gi].label.toUpperCase()}</Text>
            <Text style={styles.solvedWords}>{card.groups[gi].words.join(', ')}</Text>
          </Animated.View>
        ))}
        <View style={styles.tiles}>
          {remaining.map((w) => {
            const on = selected.includes(w);
            return (
              <Pressable key={w} onPressIn={() => toggle(w)} style={[styles.tile, on && { backgroundColor: accent }]}>
                <Text style={[styles.tileText, on && { color: '#111' }]} numberOfLines={2} adjustsFontSizeToFit>
                  {w}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.message}>{message || ' '}</Text>
      {!over ? (
        <PrimaryButton label={`Submit (${selected.length}/4)`} accent={selected.length === 4 ? accent : colors.surfaceStrong} onPress={() => selected.length === 4 && submit()} />
      ) : (
        <Result ok={won && mistakes <= 2} title={lost ? 'Out of tries. Here are the groups.' : mistakes === 0 ? 'Flawless!' : `Solved with ${mistakes} mistake${mistakes === 1 ? '' : 's'}`} />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 14, marginTop: 4, marginBottom: 12, letterSpacing: 2 },
  board: { gap: 6 },
  solved: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  solvedLabel: { color: '#111', fontSize: 13, fontWeight: '900' },
  solvedWords: { color: '#111', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  tile: {
    width: '24%',
    height: 62,
    borderRadius: 10,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tileText: { color: colors.text, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.textDim, textAlign: 'center', marginVertical: 8, fontSize: 14 },
});
