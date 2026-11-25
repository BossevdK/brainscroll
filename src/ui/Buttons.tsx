import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../theme';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

export const OptionButton = memo(function OptionButton({
  label,
  left,
  sub,
  state = 'idle',
  disabled,
  onPress,
  style,
}: {
  label: string;
  left?: ReactNode;
  sub?: string;
  state?: OptionState;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.pressed,
        state === 'correct' && styles.correct,
        state === 'wrong' && styles.wrong,
        state === 'dim' && styles.dim,
        style,
      ]}
    >
      {left}
      <View style={styles.optionText}>
        <Text style={styles.optionLabel} numberOfLines={2}>
          {label}
        </Text>
        {sub ? <Text style={styles.optionSub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
});

export function PrimaryButton({ label, onPress, accent }: { label: string; onPress: () => void; accent: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primary, { backgroundColor: accent }, pressed && styles.pressed]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

/** Result text that slides in after answering. */
export function Result({ ok, title, text }: { ok: boolean | null; title: string; text?: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.result}>
      <Text style={[styles.resultTitle, { color: ok === null ? colors.text : ok ? colors.good : colors.bad }]}>
        {title}
      </Text>
      {text ? <Text style={styles.resultText}>{text}</Text> : null}
      <Text style={styles.hint}>Swipe up for the next one</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  correct: { borderColor: colors.good, backgroundColor: 'rgba(61,220,151,0.12)' },
  wrong: { borderColor: colors.bad, backgroundColor: 'rgba(255,107,107,0.12)' },
  dim: { opacity: 0.45 },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  optionSub: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  primary: { borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#111', fontSize: 17, fontWeight: '800' },
  result: { marginTop: 18, gap: 4 },
  resultTitle: { fontSize: 21, fontWeight: '800' },
  resultText: { color: colors.text, fontSize: 16, lineHeight: 23 },
  hint: { color: colors.textDim, fontSize: 13, marginTop: 8 },
});
