import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { color, layout, textStyle, type TypeVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: keyof typeof color.text;
}

/** Text bound to the type scale. Scales with the system font size up to 200%. */
export function Text({ variant = 'body', tone = 'primary', style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={layout.maxFontScale}
      style={[textStyle(variant), { color: color.text[tone] }, style]}
      {...rest}
    />
  );
}
