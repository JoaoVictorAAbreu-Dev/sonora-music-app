import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { layout, spacing } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

/** Back chevron + title (T14/T16 "Voltar e título"), with an optional trailing action. */
export function PageHeader({
  title,
  variant = 'title',
  trailing,
  onBack = () => router.back(),
}: {
  title: string;
  variant?: 'title' | 'display';
  trailing?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <IconButton icon="chevron-left" label="Voltar" onPress={onBack} testID="back" />
        <Text variant={variant} accessibilityRole="header" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
      </View>
      {trailing}
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
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flexShrink: 1 },
});
