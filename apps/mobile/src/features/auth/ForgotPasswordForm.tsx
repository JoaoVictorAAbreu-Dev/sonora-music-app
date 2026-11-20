import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { color, layout, spacing } from '@/theme';
import { emailError, errorMessage } from './messages';

export const RESEND_SECONDS = 30;

export interface ForgotPasswordFormProps {
  onSubmit(email: string): Promise<void>;
  onBack(): void;
}

/** T04 Recuperar senha: e-mail form, then "Verifique seu e-mail" with a resend countdown. */
export function ForgotPasswordForm({ onSubmit, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    const invalid = emailError(email);
    if (invalid) {
      setError(invalid);
      AccessibilityInfo.announceForAccessibility(invalid);
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await onSubmit(email.trim());
      setSentTo(email.trim());
      setWait(RESEND_SECONDS);
      AccessibilityInfo.announceForAccessibility('Verifique seu e-mail');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <View style={styles.root}>
        <PageHeader title="Recuperar senha" onBack={onBack} />
        <View style={styles.sent} testID="forgot-sent">
          <View style={styles.badge}>
            <Icon name="mail" tint="success" />
          </View>
          <Text variant="title" accessibilityRole="header" style={styles.center}>
            Verifique seu e-mail
          </Text>
          <Text tone="secondary" style={styles.center}>
            {`Se houver uma conta para ${sentTo}, enviamos um link de redefinição. Se não encontrar, olhe a caixa de spam.`}
          </Text>
          <Button label="Voltar para entrar" onPress={onBack} testID="forgot-back-to-login" />
          <Button
            variant="text"
            label={wait > 0 ? `Reenviar em ${wait} s` : 'Reenviar link'}
            disabled={wait > 0 || loading}
            loading={loading}
            onPress={send}
            testID="forgot-resend"
          />
          {error ? (
            <Text tone="secondary" style={styles.center} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <PageHeader title="Recuperar senha" onBack={onBack} />
      <View style={styles.form} testID="forgot-form">
        <Text tone="secondary">Enviaremos um link para redefinir sua senha.</Text>
        <TextField
          testID="forgot-email"
          label="E-mail"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error) setError(undefined);
          }}
          error={error}
          disabled={loading}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="send"
          onSubmitEditing={send}
        />
      </View>
      <View style={styles.actions}>
        <Button label="Enviar link" onPress={send} loading={loading} testID="forgot-submit" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: spacing.lg },
  form: { gap: spacing.lg, paddingHorizontal: layout.screenMargin },
  actions: { marginTop: 'auto', paddingHorizontal: layout.screenMargin },
  sent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenMargin,
  },
  badge: {
    width: layout.artistAvatarSize + spacing.lg,
    height: layout.artistAvatarSize + spacing.lg,
    borderRadius: (layout.artistAvatarSize + spacing.lg) / 2,
    borderWidth: 2,
    borderColor: color.state.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
