import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { CardData } from '../cards/types';
import { CardRenderer } from './CardRenderer';
import { FeedPager } from './FeedPager';
import { FeedEngine } from './feedEngine';
import { warmUpLiveSources } from '../sources/live';
import { useSession } from '../store/session';
import { engagement } from '../store/engagement';
import { scheduleReview } from '../store/reviews';
import { useSettings } from '../store/settings';
import { loadJSON, saveJSON } from '../store/persist';
import { colors } from '../theme';

const BATCH = 8;
const keyOf = (c: CardData) => c.key;
const ONBOARDING_KEY = 'onboarding.v1';
// How long you need to look at a card for it to count as "you liked it".
const LONG_LOOK_MS = { fact: 4000, puzzle: 10000 };
const MILESTONES = new Set([5, 10, 25, 50, 100]);

function TopBar() {
  const insets = useSafeAreaInsets();
  const streak = useSession((s) => s.streak);
  const pop = useSharedValue(1);
  const prev = useRef(streak);
  useEffect(() => {
    if (streak > prev.current) {
      const big = MILESTONES.has(streak);
      pop.value = withSequence(withTiming(big ? 1.45 : 1.22, { duration: 110 }), withSpring(1, { damping: 9 }));
      if (big) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    prev.current = streak;
  }, [streak, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View pointerEvents="none" style={[styles.topBar, { top: insets.top + 12 }]}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Ionicons name="flash" size={14} color={colors.bg} />
        </View>
        <Text style={styles.logo}>brainscroll</Text>
      </View>
      {streak > 0 && (
        <Animated.View entering={FadeIn} style={[styles.streak, popStyle]}>
          <Ionicons name="flame" size={15} color="#FF9F43" />
          <Text style={styles.streakText}>{streak}</Text>
        </Animated.View>
      )}
    </View>
  );
}

/** First launch only: shows how to get to the next card, gone after the first swipe. */
function SwipeHint() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-10, { duration: 500 }), withTiming(0, { duration: 500 })), -1);
  }, [y]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.delay(1200).duration(400)}
      exiting={FadeOut.duration(250)}
      style={styles.hint}
    >
      <Animated.View style={bounce}>
        <Ionicons name="chevron-up" size={28} color={colors.text} />
      </Animated.View>
      <Text style={styles.hintText}>Swipe up for the next card</Text>
    </Animated.View>
  );
}

export function FeedScreen() {
  const engineRef = useRef<FeedEngine | null>(null);
  if (!engineRef.current) engineRef.current = new FeedEngine();
  const engine = engineRef.current;

  const [height, setHeight] = useState(0);
  const [showHint, setShowHint] = useState(() => !loadJSON(ONBOARDING_KEY, { swiped: false }).swiped);
  const [cards, setCards] = useState<CardData[]>(() => engine.next(BATCH));
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  // --- what you look at, and for how long (smart mix + spaced repetition)
  const view = useRef({ index: 0, since: Date.now() });
  const leave = useCallback((card: CardData | undefined, ms: number) => {
    if (!card || card.kind === 'break') return;
    const isFact = card.kind === 'fact';
    if (ms >= (isFact ? LONG_LOOK_MS.fact : LONG_LOOK_MS.puzzle)) {
      engagement.long(card.game ?? card.kind, card.category);
      // Facts you actually read come back later as a quick quiz.
      if (isFact && !card.fact.id.startsWith('useless-')) scheduleReview(card.fact.id);
    }
  }, []);
  const show = useCallback((card: CardData | undefined) => {
    if (card && card.kind !== 'break') engagement.shown(card.game ?? card.kind, card.category);
  }, []);

  useEffect(() => {
    warmUpLiveSources();
    show(cardsRef.current[0]);
  }, [show]);

  // --- break reminder: count only time the app is open
  const scrollMs = useRef(0);
  const lastTick = useRef(Date.now());
  const breakShown = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') lastTick.current = Date.now();
      else scrollMs.current += Date.now() - lastTick.current;
    });
    return () => sub.remove();
  }, []);

  const onIndexChange = useCallback(
    (i: number) => {
      const now = Date.now();
      const prev = view.current;
      if (i > 0 && showHint) {
        setShowHint(false);
        saveJSON(ONBOARDING_KEY, { swiped: true });
      }
      if (prev.index !== i) {
        leave(cardsRef.current[prev.index], now - prev.since);
        show(cardsRef.current[i]);
        view.current = { index: i, since: now };
      }
      scrollMs.current += now - lastTick.current;
      lastTick.current = now;

      const { breakReminder, breakMinutes } = useSettings.getState();
      const insertBreak = breakReminder && !breakShown.current && scrollMs.current >= breakMinutes * 60000;
      if (insertBreak) breakShown.current = true;

      setCards((c) => {
        let next = c;
        if (insertBreak) next = [...next.slice(0, i + 1), engine.breakCard(breakMinutes), ...next.slice(i + 1)];
        // Keep at least 5 cards ready ahead of the one you're looking at.
        if (i >= next.length - 5) next = [...next, ...engine.next(BATCH)];
        return next;
      });
    },
    [engine, leave, show, showHint],
  );

  const renderItem = useCallback(
    (card: CardData, active: boolean) => <CardRenderer card={card} active={active} height={height} />,
    [height],
  );

  return (
    <View style={styles.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <FeedPager items={cards} height={height} keyOf={keyOf} renderItem={renderItem} onIndexChange={onIndexChange} />
      )}
      <TopBar />
      {showHint && <SwipeHint />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: {
    width: 22,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  logo: { color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.6 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,159,67,0.16)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  streakText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 28, alignItems: 'center', gap: 2 },
  hintText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    overflow: 'hidden',
  },
});
