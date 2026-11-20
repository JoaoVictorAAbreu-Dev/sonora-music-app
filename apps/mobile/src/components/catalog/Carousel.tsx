import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { layout, spacing } from '@/theme';

/** Horizontal, edge-to-edge row of cards with the screen margin as inset. */
export function Carousel({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenMargin, gap: spacing.md },
});
