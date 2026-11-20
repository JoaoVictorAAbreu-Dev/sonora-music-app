import { StyleSheet, View } from 'react-native';
import { color, layout, spacing } from '@/theme';
import { Button, type ButtonVariant } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Empty / error block from T06 (illustration circle, title, description, one action). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  testID,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void; variant?: ButtonVariant };
  testID?: string;
}) {
  return (
    <View style={styles.root} testID={testID} accessibilityLiveRegion="polite">
      <View style={styles.illustration}>
        <Icon name={icon} size={layout.emptyIconSize} tint="muted" />
      </View>
      <Text variant="title" style={styles.center} accessibilityRole="header">
        {title}
      </Text>
      <Text tone="secondary" style={styles.center}>
        {description}
      </Text>
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant={action.variant ?? 'primary'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'] + spacing.sm,
    paddingVertical: spacing['2xl'],
  },
  illustration: {
    width: layout.emptyIllustrationSize,
    height: layout.emptyIllustrationSize,
    borderRadius: layout.emptyIllustrationSize / 2,
    backgroundColor: color.bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  center: { textAlign: 'center' },
});
