import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { color, layout, opacity, radius, spacing } from '@/theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'destructive';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

const tone = {
  primary: { bg: color.action.primary, pressed: color.action.pressed, text: color.text.onAction },
  secondary: { bg: undefined, pressed: color.bg.raised, text: color.text.primary },
  text: { bg: undefined, pressed: color.bg.raised, text: color.text.highlight },
  destructive: { bg: undefined, pressed: color.bg.raised, text: color.state.error },
} as const;

/** "Botão" from Figma: pill, 48 pt min height, Primário / Secundário / Texto, with Carregando. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const t = tone[variant];
  const inactive = disabled || loading;
  const disabledPrimary = disabled && variant === 'primary';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.outlined,
        variant === 'destructive' && styles.destructive,
        { backgroundColor: disabledPrimary ? color.bg.overlay : pressed ? t.pressed : t.bg },
        disabled && variant !== 'primary' && styles.disabled,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={t.text} /> : null}
        <Text
          variant="bodyStrong"
          style={{ color: disabled ? color.text.tertiary : t.text }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.buttonHeight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlined: { borderWidth: layout.borderControl, borderColor: color.border.control },
  destructive: { borderWidth: layout.borderControl, borderColor: color.state.error },
  disabled: { opacity: opacity.disabled },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
