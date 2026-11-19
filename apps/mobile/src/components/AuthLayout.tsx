import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, spacing } from '@/theme';

/**
 * Auth screen frame (T01–T03): safe area, keyboard-aware scroll, content on top and actions
 * pinned to the bottom when there is room. Scrolls instead of clipping at large text sizes.
 */
export function AuthLayout({
  children,
  footer,
  margin = spacing.xl,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** Horizontal margin: 24 on Welcome/Login, 16 on Sign up (Figma). */
  margin?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: margin,
          },
        ]}
      >
        <View style={styles.main}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  content: { flexGrow: 1, gap: spacing.xl },
  main: { flexGrow: 1, gap: spacing.lg },
  footer: { marginTop: 'auto', gap: spacing.md },
});
