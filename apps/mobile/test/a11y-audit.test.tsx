import { StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';
import { layout } from '@/theme';
import WelcomeScreen from '../src/app/(auth)/welcome';
import { LoginForm } from '@/features/auth/LoginForm';
import { SignUpForm } from '@/features/auth/SignUpForm';
import { SearchScreen } from '@/features/catalog/SearchScreen';
import { LibraryScreen } from '@/features/library/LibraryScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { PlayerScreen } from '@/features/player/PlayerScreen';
import { QueueScreen } from '@/features/player/QueueScreen';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { playerStore } from '@/features/player';
import { authStore } from '@/lib/auth/store';
import { track } from './catalog-fixtures';
import { json } from './fixtures';
import { mockFetch, renderWithQuery } from './render';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    dismissAll: jest.fn(),
  },
}));

type Node = { props: Record<string, unknown>; children: (Node | string)[] };

function textOf(node: Node | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textOf).join('');
}

/** Every control has an accessible name; icon-only controls reach 44 pt (size or hitSlop). */
function audit(name: string) {
  const problems: string[] = [];
  let checked = 0;
  for (const role of ['button', 'tab', 'switch', 'adjustable'] as const) {
    for (const el of screen.queryAllByRole(role) as unknown as Node[]) {
      checked += 1;
      const label = (el.props.accessibilityLabel as string | undefined) ?? textOf(el).trim();
      if (!label) problems.push(`${role} without a label`);
      if (role === 'button' && !textOf(el).trim()) {
        const style = StyleSheet.flatten(el.props.style as never) as
          { minHeight?: number; height?: number; width?: number } | undefined;
        const slop = el.props.hitSlop;
        const size = Math.max(style?.minHeight ?? 0, style?.height ?? 0, style?.width ?? 0);
        const slopOk =
          typeof slop === 'number'
            ? slop > 0
            : slop &&
              typeof slop === 'object' &&
              Object.values(slop).some((v) => (v as number) > 0);
        if (size < layout.minTouchTarget && !slopOk) problems.push(`small icon button "${label}"`);
      }
    }
  }
  expect(checked).toBeGreaterThan(0);
  expect({ screen: name, problems }).toEqual({ screen: name, problems: [] });
  return checked;
}

beforeAll(() => {
  mockFetch({
    current: (url) => {
      if (url.pathname === '/v1/favorites/ids') return json(200, { ids: [] });
      if (url.pathname === '/v1/playlists') return json(200, { playlists: [] });
      return json(404);
    },
  });
});

beforeEach(async () => {
  authStore.setState({
    status: 'signedIn',
    accessToken: 'tok',
    accessTokenExpiresAt: Date.now() + 600_000,
  });
  await playerStore.getState().playList([track(1), track(2), track(3)], 0);
  playerStore.setState({ status: 'playing' });
});
afterEach(() => playerStore.getState().reset());

const noop = jest.fn(async () => undefined);

describe('accessibility audit', () => {
  it.each([
    ['Welcome', () => <WelcomeScreen />],
    [
      'Login',
      () => (
        <LoginForm
          onSubmit={noop}
          onBack={jest.fn()}
          onCreateAccount={jest.fn()}
          onForgotPassword={jest.fn()}
        />
      ),
    ],
    ['Sign up', () => <SignUpForm onSubmit={noop} onBack={jest.fn()} />],
    ['Search', () => <SearchScreen />],
    ['Library', () => <LibraryScreen />],
    ['Settings', () => <SettingsScreen />],
    ['Player', () => <PlayerScreen />],
    ['Queue', () => <QueueScreen />],
    ['Mini player', () => <MiniPlayer />],
  ])('%s', async (name, ui) => {
    await renderWithQuery(ui()).view;
    audit(name);
  });
});
