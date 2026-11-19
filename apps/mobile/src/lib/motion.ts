import { Easing } from 'react-native-reanimated';
import { easing } from '@/theme';

/** Reanimated easing from a token curve. */
export function bezier(name: keyof typeof easing) {
  const [x1, y1, x2, y2] = easing[name];
  return Easing.bezier(x1, y1, x2, y2);
}
