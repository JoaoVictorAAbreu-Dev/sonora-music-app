import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { duration, layout } from '@/theme';
import { bezier } from '@/lib/motion';
import { useMotionReduced } from '@/features/settings/store';
import { useFavoriteIds, useToggleFavorite } from './api';

/**
 * Heart toggle (T12 "Favoritar"). Favoriting pops 28 → 34 pt (100 ms entrance) and settles
 * (150 ms standard); un-favoriting and Reduce Motion just swap the icon.
 */
export function FavoriteButton({
  trackId,
  title,
  size = layout.favoriteIconSize,
  testID,
}: {
  trackId: string;
  title: string;
  size?: number;
  testID?: string;
}) {
  const ids = useFavoriteIds();
  const toggle = useToggleFavorite();
  const reduce = useMotionReduced();
  const scale = useSharedValue(1);
  const on = ids.data?.has(trackId) ?? false;
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const onPress = () => {
    if (!on && !reduce) {
      scale.set(
        withSequence(
          withTiming(layout.favoritePopScale, {
            duration: duration.instant,
            easing: bezier('entrance'),
          }),
          withTiming(1, { duration: duration.micro, easing: bezier('standard') }),
        ),
      );
    }
    toggle.mutate({ trackId, on: !on });
  };

  const slop = Math.max(0, (layout.minTouchTarget - size) / 2);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Favoritar ${title}`}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      hitSlop={slop}
    >
      <Animated.View style={style}>
        <Icon name="heart" filled={on} tint={on ? 'action' : 'default'} size={size} />
      </Animated.View>
    </Pressable>
  );
}
