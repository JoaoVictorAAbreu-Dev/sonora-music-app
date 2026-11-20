import { act, renderHook } from '@testing-library/react-native';
import { useMotion } from '@/hooks/useMotion';
import { useScreenAnimation } from '@/hooks/useScreenAnimation';
import { useSettings } from '@/features/settings/store';
import { duration, reducedMotionFade } from '@/theme';

afterEach(() => useSettings.setState({ reduceMotion: false }));

describe('reduced motion', () => {
  it('uses the token transitions by default', async () => {
    const { result } = await renderHook(() => useScreenAnimation('sheet'));
    expect(result.current).toEqual({
      animation: 'slide_from_bottom',
      animationDuration: duration.complex,
    });
    const motion = await renderHook(() => useMotion());
    expect(motion.result.current.reduced).toBe(false);
    expect(motion.result.current.listLayout()).toBeDefined();
  });

  it('turns movement into a 100 ms fade when the in-app setting is on', async () => {
    await act(async () => useSettings.setState({ reduceMotion: true }));
    const screen = await renderHook(() => useScreenAnimation('push'));
    expect(screen.result.current).toEqual({
      animation: 'fade',
      animationDuration: reducedMotionFade,
    });
    const motion = await renderHook(() => useMotion());
    expect(motion.result.current.reduced).toBe(true);
    expect(motion.result.current.listLayout()).toBeUndefined();
  });
});
