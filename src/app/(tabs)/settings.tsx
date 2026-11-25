import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Category } from '../../cards/types';
import { useSettings } from '../../store/settings';
import { resetEngagement } from '../../store/engagement';
import { resetLevels } from '../../store/progress';
import { resetSeenFacts } from '../../store/seenFacts';
import { categoryTheme, colors } from '../../theme';

const MIN_ENABLED = 3;
const BREAK_OPTIONS = [10, 20, 30, 45];

function confirm(title: string, message: string, onYes: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: onYes },
  ]);
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const all = Object.keys(categoryTheme) as Category[];
  const enabledCount = all.filter((c) => !s.disabledCategories.includes(c)).length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.h2}>Topics</Text>
      <Text style={styles.note}>Switch off topics you don’t want in your feed (at least {MIN_ENABLED} stay on).</Text>
      <View style={styles.group}>
        {all.map((c) => {
          const on = !s.disabledCategories.includes(c);
          return (
            <View key={c} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: categoryTheme[c].accent }]} />
              <Text style={styles.rowText}>{categoryTheme[c].label}</Text>
              <Switch
                value={on}
                disabled={on && enabledCount <= MIN_ENABLED}
                onValueChange={() => s.toggleCategory(c)}
                trackColor={{ true: categoryTheme[c].accent, false: colors.surfaceStrong }}
              />
            </View>
          );
        })}
      </View>

      <Text style={styles.h2}>Break reminder</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <Text style={styles.rowText}>Remind me to take a break</Text>
          <Switch value={s.breakReminder} onValueChange={s.setBreakReminder} />
        </View>
        {s.breakReminder && (
          <View style={styles.chips}>
            {BREAK_OPTIONS.map((m) => (
              <Pressable
                key={m}
                onPress={() => s.setBreakMinutes(m)}
                style={[styles.chip, s.breakMinutes === m && styles.chipOn]}
              >
                <Text style={[styles.chipText, s.breakMinutes === m && { color: '#111' }]}>{m} min</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.h2}>Start over</Text>
      <View style={styles.group}>
        <Pressable
          style={styles.button}
          onPress={() =>
            confirm('Reset my preferences?', 'The feed forgets which games and topics you like most.', resetEngagement)
          }
        >
          <Text style={styles.buttonText}>Reset my preferences</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => confirm('Reset game levels?', 'Every game goes back to level 1.', resetLevels)}
        >
          <Text style={styles.buttonText}>Reset game levels</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => confirm('Forget seen facts?', 'Facts you already read can show up again.', resetSeenFacts)}
        >
          <Text style={styles.buttonText}>Forget which facts I’ve seen</Text>
        </Pressable>
      </View>

      <Text style={styles.h2}>About</Text>
      <Text style={styles.about}>
        Brainscroll keeps everything on this phone: no account, no tracking.{'\n\n'}
        Facts: Wikipedia “Did you know…” (CC BY-SA 4.0) and the Useless Facts API. Trivia: Open Trivia Database (CC BY-SA
        4.0). Numbers for comparisons: Wikidata (CC0). Word lists: ENABLE (public domain), filtered with wordfreq.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  h2: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 24, marginBottom: 8 },
  note: { color: colors.textDim, fontSize: 13, marginBottom: 10 },
  group: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { color: colors.text, fontSize: 16, flex: 1 },
  chips: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surfaceStrong },
  chipOn: { backgroundColor: colors.text },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  button: { paddingVertical: 14 },
  buttonText: { color: colors.bad, fontSize: 16, fontWeight: '600' },
  about: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
});
