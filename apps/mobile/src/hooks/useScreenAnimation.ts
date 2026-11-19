import { useReducedMotion } from 'react-native-reanimated';
import { duration, reducedMotionFade } from '@/theme';

/**
 * Native-stack transition options from Figma 09: push 320 ms; with Reduce Motion a 100 ms fade.
 * `fade` = fade-through (Login → Início).
 */
export function useScreenAnimation(kind: 'push' | 'fade') {
  const reduce = useReducedMotion();
  if (reduce) return { animation: 'fade' as const, animationDuration: reducedMotionFade };
  return {
    animation: kind === 'push' ? ('slide_from_right' as const) : ('fade' as const),
    animationDuration: duration.screen,
  };
}
