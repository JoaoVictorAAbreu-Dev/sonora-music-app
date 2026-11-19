import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { AuthLayout } from '@/components/AuthLayout';
import { Logo } from '@/components/Logo';
import { SocialButton } from '@/components/SocialButton';
import { Text } from '@/components/Text';
import { copy } from '@/features/auth/messages';
import { spacing } from '@/theme';

/** Figma logo width on T01 (251 of 393 pt), scaled down on narrow screens. */
const LOGO_WIDTH = 251;

/** T01 Boas-vindas. Google and Apple are visible but disabled until M6. */
export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  return (
    <AuthLayout>
      <View style={styles.brand} testID="screen-welcome">
        <Logo width={Math.min(LOGO_WIDTH, width - 2 * spacing['2xl'])} />
        <Text tone="secondary" style={styles.center}>
          Bem-vindo. Escolha como quer entrar.
        </Text>
      </View>
      <View style={styles.actions}>
        <SocialButton
          provider="google"
          disabled
          accessibilityHint={copy.comingSoon}
          testID="social-google"
        />
        <SocialButton
          provider="apple"
          disabled
          accessibilityHint={copy.comingSoon}
          testID="social-apple"
        />
        <Text variant="caption" tone="tertiary" style={styles.center} testID="social-coming-soon">
          Entrar com Google ou Apple: em breve.
        </Text>
        <SocialButton
          provider="email"
          onPress={() => router.push('/login')}
          testID="social-email"
        />
        <Text variant="caption" tone="tertiary" style={styles.center}>
          Ao continuar, você aceita os Termos e a Política de Privacidade.
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: spacing.xl, paddingTop: spacing.sm },
  actions: { marginTop: 'auto', gap: spacing.md },
  center: { textAlign: 'center' },
});
