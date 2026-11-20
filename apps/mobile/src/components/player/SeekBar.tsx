import { useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import { color, layout, spacing } from '@/theme';

const TRACK_HEIGHT = layout.progressTrackHeight;

/**
 * Thin seekable bar (T12 "Progresso" / volume): track border.control, fill signal.live.
 * Drag or tap to seek; screen readers adjust it with swipe up/down (adjustable role).
 */
export function SeekBar({
  value,
  max,
  onSeek,
  label,
  valueText,
  step,
  testID,
}: {
  value: number;
  max: number;
  onSeek(value: number): void;
  label: string;
  valueText: string;
  /** Increment for accessibility actions. */
  step: number;
  testID?: string;
}) {
  const width = useRef(0);
  const [dragging, setDragging] = useState<number | null>(null);
  const ratio = max > 0 ? Math.min(1, Math.max(0, (dragging ?? value) / max)) : 0;
  const at = (e: GestureResponderEvent) =>
    width.current > 0 ? Math.min(1, Math.max(0, e.nativeEvent.locationX / width.current)) * max : 0;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        onSeek(
          Math.min(
            max,
            Math.max(0, value + (e.nativeEvent.actionName === 'increment' ? step : -step)),
          ),
        )
      }
      onLayout={(e: LayoutChangeEvent) => {
        width.current = e.nativeEvent.layout.width;
      }}
      onStartShouldSetResponder={() => max > 0}
      onMoveShouldSetResponder={() => max > 0}
      onResponderGrant={(e) => setDragging(at(e))}
      onResponderMove={(e) => setDragging(at(e))}
      onResponderRelease={(e) => {
        onSeek(at(e));
        setDragging(null);
      }}
      onResponderTerminate={() => setDragging(null)}
      hitSlop={{ top: spacing.md, bottom: spacing.md }}
      style={styles.touch}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { minHeight: layout.minTouchTarget / 2, justifyContent: 'center' },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: color.border.control,
    overflow: 'hidden',
  },
  fill: { height: TRACK_HEIGHT, backgroundColor: color.signal.live },
});
