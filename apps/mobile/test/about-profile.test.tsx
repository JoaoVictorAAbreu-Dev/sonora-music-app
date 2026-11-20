import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AboutScreen, CC_LICENSES, OpenSourceScreen } from '@/features/about/AboutScreen';
import { ProfileScreen, initial } from '@/features/about/ProfileScreen';
import ossLicenses from '@/features/about/oss-licenses.json';
import { authStore } from '@/lib/auth/store';
import { user } from './fixtures';
import pkg from '../package.json';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('T17 Perfil', () => {
  it('shows name and e-mail, links and signs out', async () => {
    const signOut = jest.fn(() => Promise.resolve());
    authStore.setState({ status: 'signedIn', user: { ...user, displayName: 'Ana' }, signOut });
    await render(<ProfileScreen />);
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Ana');
    expect(screen.getByTestId('profile-email')).toHaveTextContent(user.email);
    await fireEvent.press(screen.getByTestId('profile-settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
    await fireEvent.press(screen.getByTestId('profile-about'));
    expect(mockPush).toHaveBeenCalledWith('/about');
    await fireEvent.press(screen.getByTestId('profile-sign-out'));
    expect(signOut).toHaveBeenCalled();
  });

  it('falls back to the e-mail name without a display name', async () => {
    authStore.setState({ status: 'signedIn', user: { ...user, displayName: null } });
    await render(<ProfileScreen />);
    expect(screen.getByTestId('profile-name')).toHaveTextContent(user.email.split('@')[0] ?? '');
    expect(initial(' ana')).toBe('A');
  });
});

describe('T19 Sobre e licenças', () => {
  it('opens each Creative Commons deed and the open-source list', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<AboutScreen />);
    expect(screen.getByTestId('about-intro')).toHaveTextContent(/^Sonora /);
    await fireEvent.press(screen.getByTestId('license-by-nc-sa'));
    expect(open).toHaveBeenCalledWith(
      'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br',
    );
    expect(CC_LICENSES).toHaveLength(6);
    await fireEvent.press(screen.getByTestId('about-oss'));
    expect(mockPush).toHaveBeenCalledWith('/about/open-source');
  });

  it('lists every runtime dependency with its license', async () => {
    const deps = Object.keys(pkg.dependencies).filter((d) => !d.startsWith('@sonora/'));
    expect(ossLicenses.map((p) => p.name).sort()).toEqual(deps.sort());
    await render(<OpenSourceScreen />);
    expect(screen.getByText('expo')).toBeOnTheScreen();
  });
});
