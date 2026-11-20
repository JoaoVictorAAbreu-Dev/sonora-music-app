import { router } from 'expo-router';
import { AuthLayout } from '@/components/AuthLayout';
import { LoginForm } from '@/features/auth/LoginForm';
import { authStore } from '@/lib/auth/store';

/** T02 Entrar. On success the root guard swaps (auth) for (tabs) with a fade-through. */
export default function LoginScreen() {
  return (
    <AuthLayout>
      <LoginForm
        onSubmit={(v) => authStore.getState().signIn(v)}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
        onCreateAccount={() => router.push('/sign-up')}
        onForgotPassword={() => router.push('/forgot-password')}
      />
    </AuthLayout>
  );
}
