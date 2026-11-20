import { StyleSheet, View } from 'react-native';
import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { queryClient } from '@/lib/query';
import { color, layout, spacing } from '@/theme';

/** Offline only when the OS says so; unknown reachability counts as online. */
export function isOffline(state: Network.NetworkState): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

/**
 * Keeps TanStack Query in sync with the device network: queries pause offline and refetch when
 * the connection comes back. Call once at start-up.
 */
export function connectNetwork() {
  onlineManager.setEventListener((setOnline) => {
    void Network.getNetworkStateAsync()
      .then((s) => setOnline(!isOffline(s)))
      .catch(() => undefined);
    const sub = Network.addNetworkStateListener((s) => setOnline(!isOffline(s)));
    return () => sub.remove();
  });
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** T21 "Faixa de aviso — sem conexão": shown above screen content while offline. */
export function OfflineBanner() {
  const online = useIsOnline();
  if (online) return null;
  return (
    <View style={styles.banner} testID="offline-banner" accessibilityLiveRegion="polite">
      <Text style={styles.text}>⚠ Sem conexão. Mostrando o que está salvo.</Text>
      <Button
        variant="text"
        label="Tentar de novo"
        onPress={() => {
          void Network.getNetworkStateAsync()
            .then((s) => onlineManager.setOnline(!isOffline(s)))
            .finally(() => void queryClient.refetchQueries({ type: 'active' }));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: layout.screenMargin,
    paddingVertical: spacing.xs,
    backgroundColor: color.bg.overlay,
    borderTopWidth: layout.borderControl,
    borderBottomWidth: layout.borderControl,
    borderColor: color.state.warning,
  },
  text: { flex: 1 },
});
