import { useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type TextInputInstance } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { IconButton } from '@/components/IconButton';
import { SwitchRow } from '@/components/SwitchRow';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useShake } from '@/hooks/useShake';
import { ApiRequestError } from '@/lib/api/client';
import { PASSWORD_MIN_LENGTH } from '@sonora/shared';
import { layout, spacing } from '@/theme';
import { copy, emailError, errorMessage, newPasswordError } from './messages';

type Field = 'email' | 'password' | 'confirm' | 'terms' | 'form';
type Errors = Partial<Record<Field, string>>;

export interface SignUpValues {
  email: string;
  password: string;
  acceptTerms: true;
}

export interface SignUpFormProps {
  onSubmit(values: SignUpValues): Promise<void>;
  onBack(): void;
}

export function validateSignUp(v: {
  email: string;
  password: string;
  confirm: string;
  terms: boolean;
}): Errors {
  const errors: Errors = {
    email: emailError(v.email),
    password: newPasswordError(v.password),
    confirm: v.confirm && v.confirm === v.password ? undefined : copy.passwordMismatch,
    terms: v.terms ? undefined : copy.termsRequired,
  };
  return Object.fromEntries(Object.entries(errors).filter(([, m]) => m)) as Errors;
}

/** T03 Criar conta with inline validation (on blur, then live after the first submit). */
export function SignUpForm({ onSubmit, onBack }: SignUpFormProps) {
  const [values, setValues] = useState({ email: '', password: '', confirm: '', terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);
  const { style: shakeStyle, shake } = useShake();

  const visible = (next: typeof values, t = touched, all = submitted): Errors => {
    const e = validateSignUp(next);
    if (all) return e;
    return Object.fromEntries(Object.entries(e).filter(([k]) => t[k as Field])) as Errors;
  };

  const change = (key: keyof typeof values, v: string | boolean) => {
    const next = { ...values, [key]: v };
    setValues(next);
    // Errors update live only for fields the user already left (or after a submit).
    setErrors(visible(next));
  };

  const blur = (key: Field) => {
    const t = { ...touched, [key]: true };
    setTouched(t);
    setErrors(visible(values, t));
  };

  const submit = async () => {
    setSubmitted(true);
    const e = validateSignUp(values);
    setErrors(e);
    const first = e.email ?? e.password ?? e.confirm ?? e.terms;
    if (first) {
      shake();
      AccessibilityInfo.announceForAccessibility(first);
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ email: values.email, password: values.password, acceptTerms: true });
    } catch (err) {
      setLoading(false);
      const message = errorMessage(err);
      const field: Field =
        err instanceof ApiRequestError && err.code === 'EMAIL_TAKEN' ? 'email' : 'form';
      setErrors({ [field]: message });
      shake();
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.form, shakeStyle]} testID="sign-up-form">
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Voltar" onPress={onBack} testID="back" />
          <Text variant="title" accessibilityRole="header">
            Criar conta
          </Text>
        </View>
        <Text tone="secondary">Leva menos de um minuto.</Text>
        <TextField
          testID="sign-up-email"
          label="E-mail"
          value={values.email}
          onChangeText={(v) => change('email', v)}
          onBlur={() => blur('email')}
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
          testID="sign-up-password"
          label={`Senha (mín. ${PASSWORD_MIN_LENGTH} caracteres)`}
          password
          value={values.password}
          onChangeText={(v) => change('password', v)}
          onBlur={() => blur('password')}
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
          testID="sign-up-confirm"
          label="Confirmar senha"
          password
          value={values.confirm}
          onChangeText={(v) => change('confirm', v)}
          onBlur={() => blur('confirm')}
          error={errors.confirm}
          disabled={loading}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
        />
        <SwitchRow
          testID="sign-up-terms"
          label="Aceito os Termos e a Política de Privacidade"
          value={values.terms}
          onValueChange={(v) => {
            const next = { ...values, terms: v };
            setValues(next);
            const t = { ...touched, terms: true };
            setTouched(t);
            setErrors(visible(next, t));
          }}
          error={errors.terms}
          disabled={loading}
        />
        <FieldError message={errors.form} testID="sign-up-form-error" />
      </Animated.View>
      <View style={styles.actions}>
        <Button label="Criar conta" onPress={submit} loading={loading} testID="sign-up-submit" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: spacing.xl },
  form: { gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.iconSize,
  },
  actions: { marginTop: 'auto' },
});
