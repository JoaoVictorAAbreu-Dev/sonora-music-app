import { Pressable, StyleSheet } from 'react-native';
import { color, layout } from '@/theme';
import { Text } from './Text';

/** Full-width list row with a label and a chevron (T17, T18, T19). */
export function LinkRow({
  label,
  onPress,
  hint,
  testID,
}: {
  label: string;
  onPress(): void;
  /** Spoken after the label, e.g. "Abre no navegador". */
  hint?: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.flex}>{label}</Text>
      <Text variant="title" tone="secondary" importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.fieldHeight,
    paddingHorizontal: layout.screenMargin,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.hairline,
  },
  pressed: { backgroundColor: color.bg.raised },
  flex: { flex: 1 },
});
