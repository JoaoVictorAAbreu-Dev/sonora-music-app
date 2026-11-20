import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/features/player';
import { color, layout, spacing } from '@/theme';

/**
 * Tab screen container: safe-area aware and padded so content clears the floating tab bar.
 * `padded={false}` lets carousels run edge to edge; children then add the screen margin.
 */
export function Screen({
  children,
  testID,
  padded = true,
  refreshControl,
}: {
  children: ReactNode;
  testID?: string;
  padded?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const insets = useSafeAreaInsets();
  // Leave room for the mini player when something is loaded.
  const mini = usePlayer((s) => s.queue.length > 0) ? layout.miniPlayerHeight + spacing.sm : 0;
  return (
    <ScrollView
      testID={testID}
      style={styles.root}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={refreshControl}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: padded ? layout.screenMargin : 0,
        paddingBottom: insets.bottom + layout.tabBarHeight + mini + spacing['2xl'],
        gap: spacing.xl,
      }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg.base } });
