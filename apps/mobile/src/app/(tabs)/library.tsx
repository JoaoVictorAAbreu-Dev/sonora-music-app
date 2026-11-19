import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { authStore, useAuth } from '@/lib/auth/store';
import { spacing } from '@/theme';

/** M1 shell. Sign out lives here until Profile/Settings (T17/T18) arrive. */
export default function LibraryScreen() {
  const email = useAuth((s) => s.user?.email);
  return (
    <Screen testID="screen-library">
      <Text variant="display" accessibilityRole="header">
        Biblioteca
      </Text>
      <Text tone="secondary">Favoritos, playlists e histórico.</Text>
      <View style={{ gap: spacing.sm }}>
        {email ? (
          <Text variant="caption" tone="tertiary" testID="signed-in-as">
            {`Conectado como ${email}`}
          </Text>
        ) : null}
        <Button
          variant="secondary"
          label="Sair da conta"
          onPress={() => void authStore.getState().signOut()}
          testID="sign-out"
        />
      </View>
    </Screen>
  );
}
