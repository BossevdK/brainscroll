import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { colors } from '../theme';

const THUMB = 30;
const STEPS = 400; // how often the JS side hears about changes

/**
 * Horizontal slider that runs on the UI thread. Horizontal drags are claimed by the
 * slider; vertical swipes still go to the feed.
 * `value` is 0…1 and can be read by other animated styles (e.g. to grow a bar).
 */
export function Slider({
  value,
  accent,
  disabled,
  onChange,
}: {
  value: SharedValue<number>;
  accent: string;
  disabled?: boolean;
  onChange?: (v: number) => void;
}) {
  const width = useSharedValue(0);

  const setFromX = (x: number) => {
    'worklet';
    const w = width.value - THUMB;
    if (w <= 0) return;
    value.value = Math.min(1, Math.max(0, (x - THUMB / 2) / w));
  };

  const pan = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-4, 4],
    failOffsetY: [-16, 16],
    onActivate: (e) => {
      'worklet';
      setFromX(e.x);
    },
    onUpdate: (e) => {
      'worklet';
      setFromX(e.x);
    },
  });
  const tap = useTapGesture({
    enabled: !disabled,
    onActivate: (e) => {
      'worklet';
      setFromX(e.x);
    },
  });

  const gesture = useCompetingGestures(pan, tap);

  useAnimatedReaction(
    () => Math.round(value.value * STEPS),
    (cur, prev) => {
      if (cur !== prev && onChange) scheduleOnRN(onChange, cur / STEPS);
    },
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: value.value * Math.max(0, width.value - THUMB) }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: THUMB / 2 + value.value * Math.max(0, width.value - THUMB),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.root, disabled && { opacity: 0.5 }]}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
        }}
      >
        <View style={styles.track} />
        <Animated.View style={[styles.fill, { backgroundColor: accent }, fillStyle]} />
        <Animated.View style={[styles.thumb, { borderColor: accent }, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { height: 44, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceStrong },
  fill: { position: 'absolute', left: 0, height: 8, borderRadius: 4 },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.text,
    borderWidth: 4,
  },
});
