import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { checkForUpdate, type Release } from '../lib/updates';
import { colors } from '../theme';

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/**
 * Checks GitHub once per launch. When there is a newer version it shows a card:
 * "Download" opens the APK link (Android downloads it; tap the file to install over this one).
 */
export function UpdateNotice() {
  const insets = useSafeAreaInsets();
  const [release, setRelease] = useState<Release | null>(null);

  useEffect(() => {
    // Not in development: Expo Go always runs the newest code anyway.
    if (__DEV__) return;
    const t = setTimeout(() => checkForUpdate(APP_VERSION).then(setRelease), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!release) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={[styles.wrap, { top: insets.top + 56 }]}
    >
      <View style={styles.card}>
        <View style={styles.head}>
          <Ionicons name="sparkles" size={18} color="#FACC15" />
          <Text style={styles.title}>New version: {release.tag}</Text>
        </View>
        <Text style={styles.text}>
          You have v{APP_VERSION}. Download the update and tap the file to install it. Your progress stays.
        </Text>
        {release.notes ? (
          <Text style={styles.notes} numberOfLines={5}>
            {release.notes}
          </Text>
        ) : null}
        <View style={styles.buttons}>
          <Pressable onPress={() => setRelease(null)} style={styles.later} hitSlop={6}>
            <Text style={styles.laterText}>Later</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Linking.openURL(release.apkUrl).catch(() => Linking.openURL(release.pageUrl));
              setRelease(null);
            }}
            style={({ pressed }) => [styles.download, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="download-outline" size={18} color="#111" />
            <Text style={styles.downloadText}>Download</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  card: {
    backgroundColor: '#1C1D24',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FACC15',
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  text: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
  notes: { color: colors.text, fontSize: 14, lineHeight: 20 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 4 },
  later: { paddingVertical: 10, paddingHorizontal: 6 },
  laterText: { color: colors.textDim, fontSize: 15, fontWeight: '700' },
  download: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FACC15',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  downloadText: { color: '#111', fontSize: 15, fontWeight: '800' },
});
