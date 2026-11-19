import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

/** M1 shell; real content arrives in later milestones. */
export default function IndexScreen() {
  return (
    <Screen testID="screen-index">
      <Text variant="display" accessibilityRole="header">
        Início
      </Text>
      <Text tone="secondary">Sua música começa aqui.</Text>
    </Screen>
  );
}
