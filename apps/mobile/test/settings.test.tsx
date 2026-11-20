import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { useSettings } from '@/features/settings/store';
import { authStore } from '@/lib/auth/store';
import { useToast } from '@/features/ui/toast';
import { user } from './fixtures';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { back: jest.fn() },
}));

beforeEach(() => {
  useSettings.setState({
    continuousPlayback: true,
    reduceTransparency: false,
    reduceMotion: false,
  });
  authStore.setState({ status: 'signedIn', user, accessToken: 'a' });
});

describe('Settings (T18)', () => {
  it('toggles the preferences', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByLabelText('Reprodução contínua'));
    await fireEvent.press(screen.getByLabelText('Reduzir movimento'));
    await fireEvent.press(screen.getByLabelText('Reduzir transparência'));
    expect(useSettings.getState()).toMatchObject({
      continuousPlayback: false,
      reduceMotion: true,
      reduceTransparency: true,
    });
    expect(screen.getByLabelText('Reduzir movimento')).toBeChecked();
  });

  it('deletes the account only after confirmation', async () => {
    const deleteAccount = jest.fn(async () => {
      authStore.setState({ status: 'signedOut', user: null });
    });
    authStore.setState({ deleteAccount });
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId('setting-delete-account'));
    expect(screen.getByText('Excluir conta?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cancelar'));
    expect(deleteAccount).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('setting-delete-account'));
    await fireEvent.press(screen.getByLabelText('Excluir conta'));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalled());
    expect(useToast.getState().message).toBe('Sua conta foi excluída');
  });

  it('explains a failed deletion and keeps the dialog open', async () => {
    authStore.setState({
      deleteAccount: jest.fn(async () => Promise.reject(new Error('offline'))),
    });
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId('setting-delete-account'));
    await fireEvent.press(screen.getByLabelText('Excluir conta'));
    expect(await screen.findByText(/Não foi possível excluir agora/)).toBeTruthy();
  });
});
