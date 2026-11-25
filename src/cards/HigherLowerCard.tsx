import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { HigherLowerCardData } from './types';
import { CardShell } from './CardShell';
import { OptionButton, Result } from '../ui/Buttons';
import { answered } from '../ui/feedback';
import { colors } from '../theme';

export const HigherLowerCard = memo(function HigherLowerCard({
  card,
  height,
}: {
  card: HigherLowerCardData;
  height: number;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked !== null;

  return (
    <CardShell category={card.category} level={card.level} label="Higher or lower" height={height}>
      <Text style={styles.question}>{card.question}</Text>
      <View style={styles.options}>
        {card.options.map((o, i) => (
          <OptionButton
            key={o.name}
            label={o.name}
            left={<Text style={styles.emoji}>{o.emoji}</Text>}
            sub={revealed ? o.display : undefined}
            disabled={revealed}
            state={!revealed ? 'idle' : i === card.answer ? 'correct' : i === picked ? 'wrong' : 'dim'}
            onPress={() => {
              setPicked(i);
              answered(card, i === card.answer);
            }}
            style={styles.option}
          />
        ))}
      </View>
      {revealed && (
        <Animated.View entering={FadeIn}>
          <Result ok={picked === card.answer} title={picked === card.answer ? 'Correct!' : 'Not quite.'} text={card.reveal} />
        </Animated.View>
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  question: { color: colors.text, fontSize: 28, lineHeight: 35, fontWeight: '800', marginBottom: 22 },
  options: { gap: 14 },
  option: { paddingVertical: 18 },
  emoji: { fontSize: 38 },
});
