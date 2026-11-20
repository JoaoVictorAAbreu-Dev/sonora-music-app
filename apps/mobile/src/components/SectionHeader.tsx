import { Pressable, StyleSheet, View } from 'react-native';
import { layout, spacing } from '@/theme';
import { Text } from './Text';

/** Section title with an optional caption action ("Ver tudo", "Limpar"). */
export function SectionHeader({
  title,
  variant = 'title',
  action,
}: {
  title: string;
  variant?: 'title' | 'bodyStrong';
  action?: { label: string; onPress: () => void; testID?: string };
}) {
  const slop = (layout.minTouchTarget - layout.iconSize) / 2;
  return (
    <View style={styles.row}>
      <Text variant={variant} accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {action ? (
        <Pressable
          testID={action.testID}
          accessibilityRole="button"
          accessibilityLabel={`${action.label}: ${title}`}
          onPress={action.onPress}
          hitSlop={slop}
        >
          <Text variant="caption" tone="highlight">
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: layout.screenMargin,
  },
  title: { flexShrink: 1 },
});
