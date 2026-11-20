import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { color, duration, layout } from '@/theme';
import { bezier } from '@/lib/motion';
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
  const fade = { duration: duration.micro, easing: bezier('standard') };
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
        entering={FadeIn.duration(fade.duration).easing(fade.easing)}
        exiting={FadeOut.duration(fade.duration).easing(fade.easing)}
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
