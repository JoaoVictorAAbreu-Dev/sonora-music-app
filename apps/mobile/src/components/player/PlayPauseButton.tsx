import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMotion } from '@/hooks/useMotion';
import { color, duration, layout } from '@/theme';
import { Icon } from '../Icon';

const SIZE = layout.playButtonSize;
const ICON = layout.playIconSize;

/** 64 pt orange play/pause (T12). Icons cross-fade in 150 ms; buffering shows a ring. */
export function PlayPauseButton({
  playing,
  buffering,
  onPress,
  testID,
}: {
  playing: boolean;
  buffering: boolean;
  onPress(): void;
  testID?: string;
}) {
  const motion = useMotion();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pausar' : 'Tocar'}
      accessibilityState={{ busy: buffering }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? color.action.pressed : color.action.primary },
      ]}
    >
      {buffering ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ActivityIndicator size="large" color={color.signal.live} style={styles.ring} />
        </View>
      ) : null}
      <Animated.View
        key={playing ? 'pause' : 'play'}
        entering={motion.fadeIn(duration.micro, 'standard')}
        exiting={motion.fadeOut(duration.micro)}
      >
        <Icon name={playing ? 'pause' : 'play'} filled tint="onAction" size={ICON} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { flex: 1 },
});
