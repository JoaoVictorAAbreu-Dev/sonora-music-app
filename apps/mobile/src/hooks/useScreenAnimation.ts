import { useReducedMotion } from 'react-native-reanimated';
import { duration, reducedMotionFade } from '@/theme';

/**
 * Native-stack transition options from Figma 09; with Reduce Motion every kind is a 100 ms fade.
 * push: 320 ms slide · fade: 320 ms fade-through (Login → Início) · sheet: 440 ms from the bottom
 * (mini player → player).
 */
export function useScreenAnimation(kind: 'push' | 'fade' | 'sheet') {
  const reduce = useReducedMotion();
  if (reduce) return { animation: 'fade' as const, animationDuration: reducedMotionFade };
  if (kind === 'sheet') {
    return { animation: 'slide_from_bottom' as const, animationDuration: duration.complex };
  }
  return {
    animation: kind === 'push' ? ('slide_from_right' as const) : ('fade' as const),
    animationDuration: duration.screen,
  };
}
