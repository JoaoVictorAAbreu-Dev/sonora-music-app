import { typography, type FontWeight, type TextStyle } from '@sonora/tokens';

export * from '@sonora/tokens';

/** Inter files loaded in the root layout, one per weight used by the type scale. */
export const interFamilies: Record<FontWeight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
};

export type TypeVariant = keyof typeof typography;

/**
 * React Native style for a type token. The weight is encoded in the font file name, so
 * `fontWeight` is not set (Android would otherwise synthesize a fake bold).
 */
export function textStyle(variant: TypeVariant) {
  const t: TextStyle = typography[variant];
  return {
    fontFamily: interFamilies[t.fontWeight],
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
  };
}
