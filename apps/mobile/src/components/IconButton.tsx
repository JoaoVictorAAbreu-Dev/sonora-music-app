import { Pressable, StyleSheet } from 'react-native';
import { color, layout, radius, spacing } from '@/theme';
import { Icon, type IconName } from './Icon';

/** 24 pt icon with a 44 pt touch target (hitSlop), per Figma "Botão ícone". */
export function IconButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const slop = (layout.minTouchTarget - layout.iconSize) / 2;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={slop}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: radius.lg },
  pressed: { backgroundColor: color.bg.raised, margin: -spacing.xs, padding: spacing.xs },
});
