import { useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type TextInputInstance } from 'react-native';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { PageHeader } from '@/components/PageHeader';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ApiRequestError } from '@/lib/api/client';
import { layout, spacing } from '@/theme';
import { copy, errorMessage, newPasswordError } from './messages';

export interface ResetPasswordFormProps {
  /** Token from the e-mailed link; missing when the link was opened incomplete. */
  token: string | undefined;
  onSubmit(token: string, password: string): Promise<void>;
  onDone(): void;
  onRequestNewLink(): void;
}

/** Opened from the reset e-mail (sonora://reset-password?token=…): choose a new password. */
export function ResetPasswordForm({
  token,
  onSubmit,
  onDone,
  onRequestNewLink,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [expired, setExpired] = useState(!token);
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<TextInputInstance>(null);

  const fail = (next: typeof errors) => {
    setErrors(next);
    const message = next.form ?? next.password ?? next.confirm;
    if (message) AccessibilityInfo.announceForAccessibility(message);
  };

  const submit = async () => {
    if (!token) return;
    const next = {
      password: newPasswordError(password),
      confirm: confirm === password ? undefined : copy.passwordMismatch,
    };
    if (next.password || next.confirm) return fail(next);
    setErrors({});
    setLoading(true);
    try {
      await onSubmit(token, password);
      onDone();
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiRequestError && err.code === 'RESET_TOKEN_INVALID') setExpired(true);
      fail({ form: errorMessage(err) });
    }
  };

  return (
    <View style={styles.root}>
      <PageHeader title="Nova senha" onBack={onDone} />
      {expired ? (
        <View style={styles.form} testID="reset-expired">
          <Text tone="secondary">{copy.resetTokenInvalid}</Text>
          <Button label="Pedir novo link" onPress={onRequestNewLink} testID="reset-new-link" />
        </View>
      ) : (
        <>
          <View style={styles.form} testID="reset-form">
            <Text tone="secondary">Escolha uma senha nova para sua conta.</Text>
            <TextField
              testID="reset-password"
              label="Nova senha"
              password
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              disabled={loading}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <TextField
              ref={confirmRef}
              testID="reset-confirm"
              label="Confirmar senha"
              password
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
              disabled={loading}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <FieldError message={errors.form} />
          </View>
          <View style={styles.actions}>
            <Button label="Salvar senha" onPress={submit} loading={loading} testID="reset-submit" />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: spacing.lg },
  form: { gap: spacing.lg, paddingHorizontal: layout.screenMargin },
  actions: { marginTop: 'auto', paddingHorizontal: layout.screenMargin },
});
