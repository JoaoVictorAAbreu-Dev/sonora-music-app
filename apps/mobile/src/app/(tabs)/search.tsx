import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

/** M1 shell; real content arrives in later milestones. */
export default function SearchScreen() {
  return (
    <Screen testID="screen-search">
      <Text variant="display" accessibilityRole="header">
        Buscar
      </Text>
      <Text tone="secondary">Busque por músicas, artistas e álbuns.</Text>
    </Screen>
  );
}
