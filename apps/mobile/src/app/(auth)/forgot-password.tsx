import { router } from 'expo-router';
import { AuthLayout } from '@/components/AuthLayout';
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';
import { authApi } from '@/lib/auth/store';

/** T04 Recuperar senha. */
export default function ForgotPasswordScreen() {
  return (
    <AuthLayout margin={0}>
      <ForgotPasswordForm
        onSubmit={async (email) => {
          await authApi.forgotPassword(email);
        }}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      />
    </AuthLayout>
  );
}
