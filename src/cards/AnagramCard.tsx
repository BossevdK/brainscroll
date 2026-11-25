import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnagramCardData } from './types';
import { CardShell } from './CardShell';
import { Result } from '../ui/Buttons';
import { answered, tick } from '../ui/feedback';
import { isValidWord } from '../data';
import { categoryTheme, colors } from '../theme';

/** Unscramble the word: tap letters to place them, tap a placed letter to take it back. */
export const AnagramCard = memo(function AnagramCard({ card, height }: { card: AnagramCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const [placed, setPlaced] = useState<number[]>([]); // indices into card.letters
  const [result, setResult] = useState<null | 'ok' | 'gaveUp'>(null);
  const [wrong, setWrong] = useState(false);

  const word = placed.map((i) => card.letters[i]).join('');

  const place = (i: number) => {
    if (result || placed.includes(i)) return;
    const next = [...placed, i];
    setPlaced(next);
    setWrong(false);
    tick();
    if (next.length === card.letters.length) {
      const w = next.map((x) => card.letters[x]).join('');
      if (w === card.word || isValidWord(w)) {
        setResult('ok');
        answered(card, true);
      } else {
        setWrong(true);
      }
    }
  };

  const unplace = (pos: number) => {
    if (result) return;
    setPlaced(placed.slice(0, pos));
    setWrong(false);
  };

  return (
    <CardShell category={card.category} level={card.level} label="Anagram" height={height}>
      <Text style={styles.prompt}>Unscramble the word</Text>
      <View style={styles.row}>
        {card.letters.map((_, pos) => {
          const idx = placed[pos];
          const letter = result === 'gaveUp' ? card.word[pos] : idx !== undefined ? card.letters[idx] : '';
          return (
            <Pressable
              key={pos}
              onPress={() => unplace(pos)}
              style={[
                styles.slot,
                letter !== '' && { borderColor: accent },
                result === 'ok' && { backgroundColor: colors.good, borderColor: colors.good },
                wrong && { borderColor: colors.bad },
              ]}
            >
              <Text style={[styles.slotText, result === 'ok' && { color: '#111' }]}>{letter.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>
      {wrong && <Text style={styles.wrong}>"{word.toUpperCase()}" isn't a word. Tap a letter to undo.</Text>}
      {!result && (
        <View style={[styles.row, { marginTop: 26 }]}>
          {card.letters.map((l, i) => (
            <Pressable
              key={i}
              onPressIn={() => place(i)}
              disabled={placed.includes(i)}
              style={({ pressed }) => [styles.tile, placed.includes(i) && styles.tileUsed, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <Text style={styles.tileText}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!result && (
        <Pressable
          onPress={() => {
            setResult('gaveUp');
            answered(card, false);
          }}
          style={styles.giveUp}
        >
          <Text style={styles.giveUpText}>Show me</Text>
        </Pressable>
      )}
      {result && (
        <Result
          ok={result === 'ok'}
          title={result === 'ok' ? 'Nice!' : `The word was ${card.word.toUpperCase()}`}
          text={result === 'ok' && word !== card.word ? `We had ${card.word.toUpperCase()} in mind, but ${word.toUpperCase()} counts too.` : undefined}
        />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 22 },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  slot: {
    width: 56,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: { color: colors.text, fontSize: 30, fontWeight: '900' },
  tile: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileUsed: { opacity: 0.2 },
  tileText: { color: colors.text, fontSize: 26, fontWeight: '800' },
  wrong: { color: colors.bad, fontSize: 15, textAlign: 'center', marginTop: 12 },
  giveUp: { alignSelf: 'center', marginTop: 26, padding: 8 },
  giveUpText: { color: colors.textDim, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
});
