import { useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type TextInputInstance } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useShake } from '@/hooks/useShake';
import { spacing } from '@/theme';
import { copy, emailError, errorMessage } from './messages';

export interface LoginFormProps {
  onSubmit(values: { email: string; password: string }): Promise<void>;
  onBack(): void;
  onCreateAccount(): void;
  onForgotPassword(): void;
}

/** T02 Entrar: default, "Entrando" (loading) and "Credenciais inválidas" (error + shake). */
export function LoginForm({ onSubmit, onBack, onCreateAccount, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const { style: shakeStyle, shake } = useShake();

  const fail = (next: typeof errors) => {
    setErrors(next);
    shake();
    const message = next.form ?? next.email ?? next.password;
    if (message) AccessibilityInfo.announceForAccessibility(message);
  };

  const submit = async () => {
    const fieldErrors = {
      email: emailError(email),
      password: password ? undefined : copy.passwordRequired,
    };
    if (fieldErrors.email || fieldErrors.password) return fail(fieldErrors);
    setErrors({});
    setLoading(true);
    try {
      await onSubmit({ email, password });
    } catch (err) {
      setLoading(false);
      // Wrong email and wrong password share one message (no account enumeration).
      fail({ password: errorMessage(err) });
    }
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.form, shakeStyle]} testID="login-form">
        <IconButton icon="chevron-left" label="Voltar" onPress={onBack} testID="back" />
        <View style={styles.title}>
          <Text variant="display" accessibilityRole="header">
            Entrar
          </Text>
          <Text tone="secondary">Use seu e-mail e senha.</Text>
        </View>
        <TextField
          testID="login-email"
          label="E-mail"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          disabled={loading}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          testID="login-password"
          label="Senha"
          password
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          disabled={loading}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <View style={styles.forgot}>
          <Button
            variant="text"
            label="Esqueci a senha"
            onPress={onForgotPassword}
            disabled={loading}
            testID="forgot-password"
          />
        </View>
        <FieldError message={errors.form} />
      </Animated.View>
      <View style={styles.actions}>
        <Button label="Entrar" onPress={submit} loading={loading} testID="login-submit" />
        <Button
          variant="text"
          label="Não tenho conta"
          onPress={onCreateAccount}
          disabled={loading}
          testID="go-sign-up"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: spacing.xl },
  form: { gap: spacing.lg + spacing.xs },
  title: { gap: spacing.xs },
  forgot: { alignItems: 'flex-start' },
  actions: { marginTop: 'auto', gap: spacing.md },
});
