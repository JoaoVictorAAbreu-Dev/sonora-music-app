import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { OfflineBanner, isOffline } from '@/features/network';
import { ErrorScreen } from '@/features/ui/ErrorScreen';
import { render } from '@testing-library/react-native';
import { queryClient } from '@/lib/query';

afterEach(() => act(() => onlineManager.setOnline(true)));

describe('offline (T21)', () => {
  it('treats only a definite "not connected" as offline', () => {
    expect(isOffline({ isConnected: false })).toBe(true);
    expect(isOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
    expect(isOffline({ isConnected: true })).toBe(false);
    expect(isOffline({})).toBe(false);
  });

  it('shows the banner while offline and retries when tapped', async () => {
    await render(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();
    await act(async () => onlineManager.setOnline(false));
    expect(await screen.findByText('⚠ Sem conexão. Mostrando o que está salvo.')).toBeTruthy();

    const refetch = jest.spyOn(queryClient, 'refetchQueries');
    await fireEvent.press(screen.getByLabelText('Tentar de novo'));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(Network.getNetworkStateAsync).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('offline-banner')).toBeNull());
  });
});

describe('ErrorScreen', () => {
  it('offers a retry', async () => {
    const retry = jest.fn(async () => undefined);
    await render(<ErrorScreen retry={retry} />);
    await fireEvent.press(screen.getByLabelText('Tentar de novo'));
    expect(retry).toHaveBeenCalled();
  });
});
