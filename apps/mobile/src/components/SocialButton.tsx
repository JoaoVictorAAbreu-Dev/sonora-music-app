import { Image, Pressable, StyleSheet, View } from 'react-native';
import appleLogo from '../../assets/brand/apple.png';
import googleLogo from '../../assets/brand/google.png';
import { brand, color, layout, opacity, radius, spacing } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export type Provider = 'google' | 'apple' | 'email';

const labels: Record<Provider, string> = {
  google: 'Continuar com Google',
  apple: 'Continuar com Apple',
  email: 'Continuar com e-mail',
};

const logos = { google: googleLogo, apple: appleLogo };

const palette = {
  google: brand.google,
  apple: brand.apple,
  email: {
    background: 'transparent',
    pressed: color.bg.raised,
    border: color.border.control,
    text: color.text.primary,
  },
};

/** "Botão social" (52 pt, radius lg). Provider colors follow Google/Apple brand guidelines. */
export function SocialButton({
  provider,
  onPress,
  disabled = false,
  accessibilityHint,
  testID,
}: {
  provider: Provider;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}) {
  const p = palette[provider];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={labels[provider]}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? p.pressed : p.background,
          borderColor: p.border,
          borderWidth: provider === 'email' ? layout.borderControl : 1,
        },
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.row}>
        {provider === 'email' ? (
          <Icon name="mail" size={layout.brandIconSize} />
        ) : (
          <Image source={logos[provider]} style={styles.logo} resizeMode="contain" />
        )}
        <Text variant="bodyStrong" style={{ color: p.text }} numberOfLines={2}>
          {labels[provider]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.socialButtonHeight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: { width: layout.brandIconSize, height: layout.brandIconSize },
  disabled: { opacity: opacity.disabled },
});
