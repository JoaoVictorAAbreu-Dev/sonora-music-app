import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

/** M1 shell; real content arrives in later milestones. */
export default function LibraryScreen() {
  return (
    <Screen testID="screen-library">
      <Text variant="display" accessibilityRole="header">
        Biblioteca
      </Text>
      <Text tone="secondary">Favoritos, playlists e histórico.</Text>
    </Screen>
  );
}
