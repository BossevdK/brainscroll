import { FlatList, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSaved } from '../../store/saved';
import { sourceUrl } from '../../lib/format';
import { categoryTheme, colors } from '../../theme';

/** Facts you saved with the heart button. */
export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const facts = useSaved((s) => s.facts);
  const remove = useSaved((s) => s.remove);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Saved facts</Text>
      <FlatList
        data={facts}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={40} color={colors.textDim} />
            <Text style={styles.emptyText}>Tap “Save” on a fact you like and it will show up here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const theme = categoryTheme[item.category];
          const url = sourceUrl(item.source);
          return (
            <View style={[styles.card, { borderLeftColor: theme.accent }]}>
              <Text style={[styles.cat, { color: theme.accent }]}>{theme.label.toUpperCase()}</Text>
              <Text style={styles.text}>{item.text}</Text>
              {item.useIt ? <Text style={styles.useIt}>Use it: {item.useIt}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={() => Share.share({ message: `${item.text}\n\n${url}` })} hitSlop={8}>
                  <Text style={styles.action}>Share</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(url)} hitSlop={8}>
                  <Text style={styles.action}>Source</Text>
                </Pressable>
                <Pressable onPress={() => remove(item.id)} hitSlop={8}>
                  <Text style={[styles.action, { color: colors.bad }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', paddingHorizontal: 20, marginBottom: 8 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderLeftWidth: 4, padding: 16, gap: 8 },
  cat: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  text: { color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  useIt: { color: colors.textDim, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 4 },
  action: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 12, marginTop: 80, paddingHorizontal: 30 },
  emptyText: { color: colors.textDim, fontSize: 16, textAlign: 'center', lineHeight: 22 },
});
