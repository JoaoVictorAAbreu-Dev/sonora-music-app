import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { motionPattern, opacity, reducedMotionFade } from '@/theme';
import { bezier } from '@/lib/motion';

/**
 * Error shake from Figma 07 (PB3a–c): −8 → +8 → 0 px, 60 ms per step.
 * With Reduce Motion it becomes a short opacity dip (≤ 100 ms) instead of movement.
 */
export function useShake() {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const fade = useSharedValue(1);

  const shake = useCallback(() => {
    if (reduceMotion) {
      const half = { duration: reducedMotionFade / 2, easing: bezier('standard') };
      fade.set(withSequence(withTiming(opacity.disabled, half), withTiming(1, half)));
      return;
    }
    const { distance, stepMs } = motionPattern.shake;
    const step = { duration: stepMs, easing: bezier('standard') };
    x.set(
      withSequence(withTiming(-distance, step), withTiming(distance, step), withTiming(0, step)),
    );
  }, [reduceMotion, x, fade]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    opacity: fade.get(),
  }));

  return { style, shake };
}
