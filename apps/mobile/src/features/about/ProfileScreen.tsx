import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { LinkRow } from '@/components/LinkRow';
import { PageHeader } from '@/components/PageHeader';
import { Text } from '@/components/Text';
import { authStore, useAuth } from '@/lib/auth/store';
import { color, layout, spacing } from '@/theme';

/** First letter of the name (or e-mail) for the avatar. */
export function initial(name: string): string {
  return (name.trim()[0] ?? '?').toLocaleUpperCase('pt-BR');
}

/** T17 Perfil: avatar, name, e-mail, links and "Sair". */
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const email = user?.email ?? '';
  const name = user?.displayName?.trim() || email.split('@')[0] || '';

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]} testID="screen-profile">
      <PageHeader title="Perfil" variant="display" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity} accessible accessibilityLabel={`${name}, ${email}`}>
          <View style={styles.avatar}>
            <Text variant="title" importantForAccessibility="no">
              {initial(name || email)}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="title" numberOfLines={1} testID="profile-name">
              {name}
            </Text>
            <Text tone="secondary" numberOfLines={1} testID="profile-email">
              {email}
            </Text>
          </View>
        </View>
        <View>
          <LinkRow
            label="Configurações"
            onPress={() => router.push('/settings')}
            testID="profile-settings"
          />
          <LinkRow
            label="Sobre e licenças"
            onPress={() => router.push('/about')}
            testID="profile-about"
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          variant="secondary"
          label="Sair"
          onPress={() => void authStore.getState().signOut()}
          testID="profile-sign-out"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base, gap: spacing.lg },
  content: { gap: spacing.lg },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: layout.screenMargin,
  },
  avatar: {
    width: layout.artistAvatarSize - spacing.lg,
    height: layout.artistAvatarSize - spacing.lg,
    borderRadius: (layout.artistAvatarSize - spacing.lg) / 2,
    backgroundColor: color.bg.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  footer: { paddingHorizontal: layout.screenMargin },
});
