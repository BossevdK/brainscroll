import { memo, useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

/**
 * TikTok-style vertical pager.
 * - A short flick (velocity) or dragging ~12% of the screen moves one card.
 * - Every flick moves exactly one card, even while the previous animation is running,
 *   so quick repeated flicks feel snappy.
 * - Everything runs on the UI thread (Reanimated), only the "which card is active"
 *   index goes back to React.
 * - Only a small window of cards around the active one is mounted.
 */

const DISTANCE_THRESHOLD = 0.12; // fraction of screen height
const VELOCITY_THRESHOLD = 450; // px/s
const WINDOW_BEFORE = 1;
const WINDOW_AFTER = 2;
const SPRING = { damping: 32, stiffness: 340, mass: 0.9, overshootClamping: true } as const;

type Props<T> = {
  items: readonly T[];
  height: number;
  keyOf: (item: T) => string;
  renderItem: (item: T, active: boolean) => ReactNode;
  onIndexChange?: (index: number) => void;
};

const Page = memo(function Page({
  index,
  height,
  position,
  children,
}: {
  index: number;
  height: number;
  position: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: index * height + position.value }],
  }));
  return <Animated.View style={[styles.page, { height }, style]}>{children}</Animated.View>;
});

export function FeedPager<T>({ items, height, keyOf, renderItem, onIndexChange }: Props<T>) {
  const [index, setIndex] = useState(0);
  const position = useSharedValue(0); // = -activeIndex * height while at rest
  const target = useSharedValue(0); // index the pager is moving to / resting at
  const start = useSharedValue(0);
  const count = useSharedValue(items.length);
  useEffect(() => {
    count.value = items.length;
  }, [items.length, count]);

  const commitIndex = useCallback(
    (i: number) => {
      setIndex(i);
      onIndexChange?.(i);
    },
    [onIndexChange],
  );

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    failOffsetX: [-24, 24],
    onBegin: () => {
      'worklet';
      cancelAnimation(position);
      start.value = position.value;
    },
    onUpdate: (e) => {
      'worklet';
      let next = start.value + e.translationY;
      // Rubber band above the first card and below the last one.
      const min = -(count.value - 1) * height;
      if (next > 0) next = next * 0.3;
      if (next < min) next = min + (next - min) * 0.3;
      position.value = next;
    },
    onDeactivate: (e) => {
      'worklet';
      const moved = position.value - start.value;
      let dir = 0;
      if (moved < -height * DISTANCE_THRESHOLD || e.velocityY < -VELOCITY_THRESHOLD) dir = 1;
      else if (moved > height * DISTANCE_THRESHOLD || e.velocityY > VELOCITY_THRESHOLD) dir = -1;
      // If a velocity points the other way than the drag, trust the velocity.
      if (dir === 1 && e.velocityY > VELOCITY_THRESHOLD) dir = 0;
      if (dir === -1 && e.velocityY < -VELOCITY_THRESHOLD) dir = 0;

      // Base on the card we were already heading to, so a second quick flick
      // during the animation moves one more card instead of being lost.
      const base = target.value;
      const next = Math.max(0, Math.min(count.value - 1, base + dir));
      target.value = next;
      position.value = withSpring(-next * height, { ...SPRING, velocity: e.velocityY });
      scheduleOnRN(commitIndex, next);
    },
  });

  const first = Math.max(0, index - WINDOW_BEFORE);
  const last = Math.min(items.length - 1, index + WINDOW_AFTER);
  const pages: ReactNode[] = [];
  for (let i = first; i <= last; i++) {
    const item = items[i];
    pages.push(
      <Page key={keyOf(item)} index={i} height={height} position={position}>
        {renderItem(item, i === index)}
      </Page>,
    );
  }

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.root}>{pages}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  page: { position: 'absolute', left: 0, right: 0, top: 0 },
});
