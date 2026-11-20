import { Modal, StyleSheet, View } from 'react-native';
import { color, opacity, radius, spacing, withAlpha } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

/**
 * T20 Diálogo de confirmação: solid card over a 60% black scrim. The destructive action is the
 * outlined red button; "Cancelar" is the primary (safe) one.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm(): void;
  onCancel(): void;
  busy?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.scrim}>
        <View
          style={styles.dialog}
          accessibilityViewIsModal
          accessibilityRole="alert"
          testID="confirm-dialog"
        >
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          <Text tone="secondary">{message}</Text>
          <View style={styles.actions}>
            <Button variant="destructive" label={confirmLabel} onPress={onConfirm} loading={busy} />
            <Button label="Cancelar" onPress={onCancel} disabled={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: withAlpha(color.shadow, opacity.scrim),
  },
  dialog: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: color.bg.overlay,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
