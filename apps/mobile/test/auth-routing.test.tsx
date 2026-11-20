import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../src/app/_layout';
import Index from '../src/app/index';
import AuthLayout from '../src/app/(auth)/_layout';
import Welcome from '../src/app/(auth)/welcome';
import Login from '../src/app/(auth)/login';
import SignUp from '../src/app/(auth)/sign-up';
import TabsLayout from '../src/app/(tabs)/_layout';
import Home from '../src/app/(tabs)/home';
import Search from '../src/app/(tabs)/search';
import Library from '../src/app/(tabs)/library';
import Settings from '../src/app/settings';
import { authStore } from '@/lib/auth/store';
import { user } from './fixtures';

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

const routes = {
  _layout: RootLayout,
  index: Index,
  '(auth)/_layout': AuthLayout,
  '(auth)/welcome': Welcome,
  '(auth)/login': Login,
  '(auth)/sign-up': SignUp,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': Home,
  '(tabs)/search': Search,
  '(tabs)/library': Library,
  settings: Settings,
};

describe('route guards', () => {
  it('sends signed-out users to Welcome, then Login, and signed-in users to the tabs', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByTestId('screen-welcome')).toBeTruthy();
    expect(screen.getByTestId('social-google')).toBeDisabled();
    expect(screen.getByTestId('social-apple')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('social-email'));
    expect(await screen.findByTestId('login-form')).toBeTruthy();
    expect(screen).toHavePathname('/login');

    await act(async () => {
      authStore.setState({ status: 'signedIn', user, accessToken: 'a' });
    });
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(screen.queryByTestId('login-form')).toBeNull();

    // Signing out swaps back to the auth stack.
    await fireEvent.press(screen.getByTestId('tab-library'));
    expect(await screen.findByTestId('screen-library')).toBeTruthy();
    await fireEvent.press(await screen.findByTestId('library-settings'));
    await fireEvent.press(await screen.findByTestId('sign-out'));
    expect(await screen.findByTestId('screen-welcome')).toBeTruthy();
  });
});
