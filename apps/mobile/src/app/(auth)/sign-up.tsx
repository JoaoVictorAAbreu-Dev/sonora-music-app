import { router } from 'expo-router';
import { AuthLayout } from '@/components/AuthLayout';
import { SignUpForm } from '@/features/auth/SignUpForm';
import { authStore } from '@/lib/auth/store';
import { spacing } from '@/theme';

/** T03 Criar conta. */
export default function SignUpScreen() {
  return (
    <AuthLayout margin={spacing.lg}>
      <SignUpForm
        onSubmit={(v) => authStore.getState().signUp(v)}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      />
    </AuthLayout>
  );
}
