import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CardData } from '../../cards/types';
import { CardRenderer } from '../../feed/CardRenderer';
import { FeedPager } from '../../feed/FeedPager';
import { makeDailyCards } from '../../feed/daily';
import { DAILY_COUNT, todayString, useDaily } from '../../store/daily';
import { colors } from '../../theme';

const keyOf = (c: CardData) => c.key;

/** Five puzzles a day, the same for everyone. Finish all five to keep your daily streak. */
export default function DailyScreen() {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(todayString());
  const [height, setHeight] = useState(0);
  const results = useDaily((s) => s.results);
  const streak = useDaily((s) => s.streak);

  // New day while the app was open? Load the new challenge.
  useFocusEffect(
    useCallback(() => {
      useDaily.getState().refresh();
      setDate(todayString());
    }, []),
  );

  const cards = useMemo(() => makeDailyCards(date), [date]);
  const done = cards.filter((c) => c.key in results).length;
  const right = cards.filter((c) => results[c.key]).length;

  const renderItem = useCallback(
    (card: CardData, active: boolean) => <CardRenderer card={card} active={active} height={height} />,
    [height],
  );

  return (
    <View style={styles.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && <FeedPager items={cards} height={height} keyOf={keyOf} renderItem={renderItem} />}
      <View pointerEvents="none" style={[styles.top, { top: insets.top + 12 }]}>
        <Text style={styles.title}>Daily challenge</Text>
        <View style={styles.right}>
          <View style={styles.dots}>
            {cards.map((c) => (
              <View
                key={c.key}
                style={[
                  styles.dot,
                  c.key in results && { backgroundColor: results[c.key] ? colors.good : colors.bad },
                ]}
              />
            ))}
          </View>
          <Text style={styles.streak}>🔥 {streak}</Text>
        </View>
      </View>
      {done === DAILY_COUNT && (
        <View pointerEvents="none" style={[styles.doneBanner, { top: insets.top + 40 }]}>
          <Text style={styles.doneText}>
            Done for today: {right}/{DAILY_COUNT} right. New puzzles tomorrow!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { position: 'absolute', left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfaceStrong },
  streak: { color: colors.text, fontSize: 14, fontWeight: '800' },
  doneBanner: { position: 'absolute', left: 24, right: 24 },
  doneText: { color: colors.good, fontSize: 13, fontWeight: '700' },
});
