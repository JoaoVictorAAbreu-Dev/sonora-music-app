import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout, spacing } from '@/theme';

/** Tab screen container: safe-area aware and padded so content clears the floating tab bar. */
export function Screen({ children, testID }: { children: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: layout.screenMargin,
        paddingBottom: insets.bottom + layout.tabBarHeight + spacing['2xl'],
        gap: spacing.xl,
      }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg.base } });
