import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, duration, layout, opacity, radius, spacing, withAlpha } from '@/theme';
import { bezier } from '@/lib/motion';
import { Text } from './Text';

/**
 * Bottom sheet (T10 "Gerenciar playlist", T15 "Adicionar à playlist"). Solid surface: Liquid Glass
 * stays on the controls layer only. Slides up in 440 ms (skipped with Reduce Motion).
 */
export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  testID,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose(): void;
  children: ReactNode;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.duration(duration.complex).easing(bezier('entrance'))}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          accessibilityViewIsModal
          testID={testID}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="bodyStrong" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" tone="secondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** One row of actions in a sheet (icon + label, 56 pt). */
export function SheetAction({
  icon,
  label,
  onPress,
  destructive = false,
  testID,
}: {
  icon: ReactNode;
  label: string;
  onPress(): void;
  destructive?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      {icon}
      <Text style={destructive ? { color: color.state.error } : undefined}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: withAlpha(color.shadow, opacity.scrim),
  },
  sheet: {
    backgroundColor: color.bg.raised,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: layout.sheetHandleWidth,
    height: layout.progressTrackHeight,
    borderRadius: layout.progressTrackHeight / 2,
    backgroundColor: color.border.control,
    marginBottom: spacing.sm,
  },
  header: {
    paddingHorizontal: layout.screenMargin,
    paddingVertical: spacing.md,
    gap: layout.iconLabelGap,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: layout.fieldHeight,
    paddingHorizontal: layout.screenMargin,
  },
  pressed: { backgroundColor: color.bg.overlay },
});
