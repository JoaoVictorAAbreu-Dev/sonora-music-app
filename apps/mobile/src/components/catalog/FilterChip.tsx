import { Pressable, StyleSheet } from 'react-native';
import { color, layout, radius, spacing } from '@/theme';
import { Text } from '../Text';

/** "Chip de filtro": 36 pt pill; selected = orange fill with a check. */
export function FilterChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const vertical = (layout.minTouchTarget - layout.chipHeight) / 2;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: vertical, bottom: vertical }}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      <Text
        variant="caption"
        style={{ color: selected ? color.text.onAction : color.text.primary }}
      >
        {selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: layout.chipHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  idle: { borderWidth: layout.borderControl, borderColor: color.border.control },
  selected: { backgroundColor: color.action.primary },
});
