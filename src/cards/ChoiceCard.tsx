import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ChoiceCardData } from './types';
import { CardShell } from './CardShell';
import { OptionButton, Result } from '../ui/Buttons';
import { answered } from '../ui/feedback';
import { colors } from '../theme';

/** Multiple choice: flags, capitals, number sequences, trivia. */
export const ChoiceCard = memo(function ChoiceCard({ card, height }: { card: ChoiceCardData; height: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked !== null;
  const ok = picked === card.answer;
  const heroIsEmoji = card.hero && card.hero.length <= 4;

  return (
    <CardShell category={card.category} level={card.level} label={card.label} height={height}>
      {card.hero ? (
        <Text style={heroIsEmoji ? styles.heroEmoji : styles.heroText} adjustsFontSizeToFit numberOfLines={2}>
          {card.hero}
        </Text>
      ) : null}
      <Text style={styles.prompt}>{card.prompt}</Text>
      <View style={styles.options}>
        {card.options.map((o, i) => (
          <OptionButton
            key={`${i}-${o}`}
            label={o}
            disabled={revealed}
            state={!revealed ? 'idle' : i === card.answer ? 'correct' : i === picked ? 'wrong' : 'dim'}
            onPress={() => {
              setPicked(i);
              answered(card, i === card.answer);
            }}
          />
        ))}
      </View>
      {revealed && (
        <Result
          ok={ok}
          title={ok ? 'Correct!' : `It was: ${card.options[card.answer]}`}
          text={card.explanation}
        />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  heroEmoji: { fontSize: 96, textAlign: 'center', marginBottom: 8 },
  heroText: { color: colors.text, fontSize: 34, fontWeight: '800', textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  prompt: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '800', marginBottom: 18 },
  options: { gap: 10 },
});
