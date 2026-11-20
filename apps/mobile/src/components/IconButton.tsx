import { Pressable, StyleSheet } from 'react-native';
import { color, layout, radius, spacing } from '@/theme';
import { Icon, type IconName, type IconProps } from './Icon';

/** 24 pt icon with a 44 pt touch target (hitSlop), per Figma "Botão ícone". */
export function IconButton({
  icon,
  label,
  onPress,
  testID,
  filled = false,
  tint = 'default',
  size = layout.iconSize,
  selected,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
  filled?: boolean;
  tint?: IconProps['tint'];
  size?: number;
  /** For toggles (shuffle, repeat, favorite): announced as selected. */
  selected?: boolean;
  disabled?: boolean;
}) {
  const slop = Math.max(0, (layout.minTouchTarget - size) / 2);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Icon name={icon} filled={filled} tint={tint} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: radius.lg },
  pressed: { backgroundColor: color.bg.raised, margin: -spacing.xs, padding: spacing.xs },
});
