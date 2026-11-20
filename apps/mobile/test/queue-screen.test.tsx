import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { QueueScreen } from '@/features/player/QueueScreen';
import { playerStore } from '@/features/player';
import { authStore } from '@/lib/auth/store';
import { track } from './catalog-fixtures';

const mockBack = jest.fn();
const mockNavigate = jest.fn();
const mockDismissAll = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    back: () => mockBack(),
    navigate: (...a: unknown[]) => mockNavigate(...a),
    dismissAll: () => mockDismissAll(),
  },
}));

const ids = () => playerStore.getState().queue.map((t) => t.id);

beforeEach(async () => {
  authStore.setState({
    status: 'signedIn',
    accessToken: 'tok',
    accessTokenExpiresAt: Date.now() + 600_000,
  });
  await playerStore.getState().playList([track(1), track(2), track(3), track(4)], 0);
  playerStore.setState({ status: 'playing' });
});
afterEach(() => playerStore.getState().reset());

describe('Queue (T13)', () => {
  it('shows what is playing and what comes next', async () => {
    await render(<QueueScreen />);
    expect(screen.getByText('TOCANDO AGORA')).toBeTruthy();
    expect(screen.getByTestId('queue-upcoming-label')).toHaveTextContent('A SEGUIR · 3 MÚSICAS');
    expect(screen.getByLabelText('Synthetic Track 2, Fixture Artist, posição 1 de 3')).toBeTruthy();
  });

  it('reorders and removes through accessibility actions', async () => {
    await render(<QueueScreen />);
    const item = screen.getByLabelText('Synthetic Track 4, Fixture Artist, posição 3 de 3');
    await fireEvent(item, 'accessibilityAction', { nativeEvent: { actionName: 'moveUp' } });
    expect(ids()).toEqual(['1', '2', '4', '3']);

    const first = screen.getByLabelText('Synthetic Track 2, Fixture Artist, posição 1 de 3');
    await fireEvent(first, 'accessibilityAction', { nativeEvent: { actionName: 'moveUp' } });
    expect(ids()).toEqual(['1', '2', '4', '3']); // cannot move above the playing track

    await fireEvent(first, 'accessibilityAction', { nativeEvent: { actionName: 'remove' } });
    expect(ids()).toEqual(['1', '4', '3']);
    expect(await screen.findByText('A SEGUIR · 2 MÚSICAS')).toBeTruthy();
  });

  it('removes with the revealed swipe action button', async () => {
    await render(<QueueScreen />);
    await fireEvent.press(screen.getByTestId('queue-remove-3'));
    expect(ids()).toEqual(['1', '2', '4']);
  });

  it('reorders by dragging the handle', async () => {
    await render(<QueueScreen />);
    // The handle is hidden from screen readers on purpose (they use the actions above).
    const handle = screen.getByTestId('queue-handle-2', { includeHiddenElements: true });
    await fireEvent(handle, 'responderGrant', { nativeEvent: { pageX: 10, pageY: 100 } });
    await fireEvent(handle, 'responderMove', { nativeEvent: { pageX: 10, pageY: 100 + 64 * 2 } });
    expect(screen.getByTestId('queue-drop-indicator')).toBeTruthy();
    await fireEvent(handle, 'responderRelease', { nativeEvent: { pageX: 10, pageY: 228 } });
    expect(ids()).toEqual(['1', '3', '4', '2']);
  });

  it('clears the upcoming tracks and shows the empty state when nothing is loaded', async () => {
    await render(<QueueScreen />);
    await fireEvent.press(screen.getByTestId('queue-clear'));
    expect(ids()).toEqual(['1']);
    await playerStore.getState().reset();
    const empty = await screen.findByTestId('queue-empty');
    expect(within(empty).getByText('Sua fila está vazia')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Explorar música'));
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });
});
