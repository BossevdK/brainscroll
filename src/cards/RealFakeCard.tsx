import { memo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RealFakeCardData } from './types';
import { CardShell } from './CardShell';
import { OptionButton, Result } from '../ui/Buttons';
import { answered } from '../ui/feedback';
import { sourceUrl } from '../lib/format';
import { colors } from '../theme';

export const RealFakeCard = memo(function RealFakeCard({ card, height }: { card: RealFakeCardData; height: number }) {
  const [pick, setPick] = useState<boolean | null>(null);
  const revealed = pick !== null;
  const ok = pick === card.isReal;

  const choose = (saysReal: boolean) => {
    setPick(saysReal);
    answered(card, saysReal === card.isReal);
  };

  return (
    <CardShell category={card.category} level={card.level} label="Real or fake?" height={height}>
      <Text style={styles.statement}>{card.statement}</Text>
      <View style={styles.buttons}>
        <OptionButton
          label="✅  Real"
          disabled={revealed}
          state={!revealed ? 'idle' : card.isReal ? 'correct' : pick ? 'wrong' : 'dim'}
          onPress={() => choose(true)}
          style={styles.btn}
        />
        <OptionButton
          label="🤥  Fake"
          disabled={revealed}
          state={!revealed ? 'idle' : !card.isReal ? 'correct' : pick === false ? 'wrong' : 'dim'}
          onPress={() => choose(false)}
          style={styles.btn}
        />
      </View>
      {revealed && (
        <View>
          <Result
            ok={ok}
            title={card.isReal ? (ok ? 'Yes, really!' : "It's real!") : ok ? 'Good eye, it was fake.' : 'Fooled you, it was fake.'}
            text={card.isReal ? undefined : `The real version: ${card.original}`}
          />
          <Pressable onPress={() => Linking.openURL(sourceUrl(card.source))} style={styles.link}>
            <Text style={styles.linkText}>Read more</Text>
          </Pressable>
        </View>
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  statement: { color: colors.text, fontSize: 24, lineHeight: 33, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 26 },
  btn: { flex: 1, justifyContent: 'center' },
  link: { marginTop: 8, alignSelf: 'flex-start' },
  linkText: { color: colors.textDim, fontSize: 15, textDecorationLine: 'underline' },
});
