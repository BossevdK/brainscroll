import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const ROWS = ['qwertyuiop', 'asdfghjkl', '⏎zxcvbnm⌫'];

/**
 * On-screen QWERTY keyboard. Keys fire on touch-DOWN (like a real keyboard) and only
 * re-render when their own colour changes. Doesn't open the system keyboard, so the
 * feed layout never jumps.
 */
const Key = memo(function Key({
  k,
  color,
  enterLabel,
  onKey,
}: {
  k: string;
  color?: string;
  enterLabel: string;
  onKey: (k: string) => void;
}) {
  const wide = k === '⏎' || k === '⌫';
  return (
    <Pressable
      onPressIn={() => onKey(k)}
      style={({ pressed }) => [styles.key, wide && styles.keyWide, color ? { backgroundColor: color } : null, pressed && styles.pressed]}
    >
      <Text style={[styles.keyText, k === '⏎' && styles.keyTextSmall]}>{k === '⏎' ? enterLabel : k.toUpperCase()}</Text>
    </Pressable>
  );
});

export const LetterKeyboard = memo(function LetterKeyboard({
  onKey,
  colorsByKey,
  enterLabel = 'ENTER',
  showEnter = true,
}: {
  /** Must be a stable callback (useCallback). Receives a letter, '⏎' or '⌫'. */
  onKey: (k: string) => void;
  colorsByKey?: Record<string, string | undefined>;
  enterLabel?: string;
  showEnter?: boolean;
}) {
  return (
    <View style={styles.kb}>
      {ROWS.map((row, r) => (
        <View key={row} style={[styles.row, r === 1 && styles.indent]}>
          {row
            .split('')
            .filter((k) => showEnter || k !== '⏎')
            .map((k) => (
              <Key key={k} k={k} color={colorsByKey?.[k]} enterLabel={enterLabel} onKey={onKey} />
            ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  // Uses (almost) the full screen width: pulled out of the card's side padding.
  kb: { gap: 8, marginHorizontal: -18 },
  row: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  indent: { paddingHorizontal: 16 },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: { flex: 1.5 },
  pressed: { opacity: 0.6 },
  keyText: { color: colors.text, fontSize: 18, fontWeight: '800' },
  keyTextSmall: { fontSize: 12 },
});
