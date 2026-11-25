import { memo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Category } from './types';
import { HELP } from './help';
import { categoryTheme, colors } from '../theme';

type Props = {
  category: Category;
  label: string;
  height: number;
  /** Player's level in this game (shown as a badge). */
  level?: number;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Full-screen page with category colour, chip and label. Shared by every card type.
 * Games get a "?" button that shows how to play (texts in help.ts, looked up by label).
 */
export const CardShell = memo(function CardShell({ category, label, height, level, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const theme = categoryTheme[category];
  const help = HELP[label];
  const [showHelp, setShowHelp] = useState(false);

  return (
    <View
      style={[
        styles.page,
        { height, backgroundColor: theme.bg, paddingTop: insets.top + 64, paddingBottom: 20 },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.chip, { borderColor: theme.accent }]}>
          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          <Text style={[styles.chipText, { color: theme.accent }]}>{theme.label.toUpperCase()}</Text>
        </View>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {level !== undefined ? (
            <View style={[styles.levelBadge, { backgroundColor: theme.accent + '26' }]}>
              <Text style={[styles.levelText, { color: theme.accent }]}>LV {level + 1}</Text>
            </View>
          ) : null}
          {help ? (
            <Pressable
              onPress={() => setShowHelp((s) => !s)}
              hitSlop={12}
              style={[styles.helpBtn, showHelp && { backgroundColor: theme.accent, borderColor: theme.accent }]}
            >
              <Text style={[styles.helpBtnText, showHelp && { color: '#111' }]}>?</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
      {footer}

      {showHelp && help ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[styles.helpOverlay, { top: insets.top + 130 }]}
        >
          <Pressable onPress={() => setShowHelp(false)} style={[styles.helpCard, { borderColor: theme.accent }]}>
            <Text style={[styles.helpTitle, { color: theme.accent }]}>HOW TO PLAY</Text>
            <Text style={styles.helpText}>{help}</Text>
            <Text style={styles.helpClose}>Tap to close</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  page: { paddingHorizontal: 24 },
  header: { gap: 10 },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  levelBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  levelText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  helpBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  body: { flex: 1, justifyContent: 'center' },
  helpOverlay: { position: 'absolute', left: 16, right: 16 },
  helpCard: {
    backgroundColor: '#1C1D24',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  helpTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  helpText: { color: colors.text, fontSize: 17, lineHeight: 25 },
  helpClose: { color: colors.textDim, fontSize: 13, marginTop: 4 },
});
