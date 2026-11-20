import { router, useLocalSearchParams } from 'expo-router';
import { AuthLayout } from '@/components/AuthLayout';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';
import { copy } from '@/features/auth/messages';
import { showToast } from '@/features/ui/toast';
import { authApi } from '@/lib/auth/store';

/** Deep link target of the reset e-mail: sonora://reset-password?token=… */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return (
    <AuthLayout margin={0}>
      <ResetPasswordForm
        token={token}
        onSubmit={async (t, password) => {
          await authApi.resetPassword(t, password);
          showToast(copy.passwordChanged);
        }}
        onDone={() => router.replace('/login')}
        onRequestNewLink={() => router.replace('/forgot-password')}
      />
    </AuthLayout>
  );
}
