import { FadeIn, FadeOut, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { duration, reducedMotionFade, type easing } from '@/theme';
import { useMotionReduced } from '@/features/settings/store';
import { bezier } from '@/lib/motion';

type Curve = keyof typeof easing;

/**
 * Layout-animation builders that follow the motion tokens and both Reduce Motion settings
 * (system and in-app). With reduced motion, movement becomes a ≤ 100 ms fade and list
 * re-layout is instant (Figma 09, section 6).
 */
export function useMotion() {
  const reduced = useMotionReduced();
  return {
    reduced,
    fadeIn: (ms: number = duration.standard, curve: Curve = 'entrance') =>
      reduced ? FadeIn.duration(reducedMotionFade) : FadeIn.duration(ms).easing(bezier(curve)),
    fadeOut: (ms: number = duration.micro) =>
      FadeOut.duration(reduced ? Math.min(ms, reducedMotionFade) : ms),
    /** Bottom sheets: slide up 440 ms, or a short fade. */
    sheetIn: () =>
      reduced
        ? FadeIn.duration(reducedMotionFade)
        : SlideInDown.duration(duration.complex).easing(bezier('entrance')),
    /** Rows moving after a reorder/removal; none with reduced motion. */
    listLayout: () =>
      reduced ? undefined : LinearTransition.duration(duration.standard).easing(bezier('standard')),
  };
}
