import { StyleSheet, View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { color } from '@/theme';

/** Shown by Expo Router when a screen throws while rendering. */
export function ErrorScreen({ retry }: Pick<ErrorBoundaryProps, 'retry'>) {
  return (
    <View style={styles.root} testID="error-screen">
      <EmptyState
        icon="queue"
        title="Algo deu errado"
        description="Esta tela não carregou. Tente de novo; se continuar, feche e abra o app."
        action={{ label: 'Tentar de novo', onPress: () => void retry() }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', backgroundColor: color.bg.base },
});
