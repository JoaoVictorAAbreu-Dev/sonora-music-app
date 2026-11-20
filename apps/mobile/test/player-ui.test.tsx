import { fireEvent, render, screen } from '@testing-library/react-native';
import TrackPlayer from 'react-native-track-player';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { PlayerScreen } from '@/features/player/PlayerScreen';
import { formatTime, spokenTime } from '@/features/player/format';
import { playerStore } from '@/features/player';
import { toEngineState } from '@/features/player/rntp-engine';
import { authStore } from '@/lib/auth/store';
import { track } from './catalog-fixtures';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: (...a: unknown[]) => mockPush(...a), back: () => mockBack() },
}));

async function playing(
  status: 'playing' | 'paused' | 'loading' | 'buffering' | 'error' = 'playing',
) {
  authStore.setState({
    status: 'signedIn',
    accessToken: 'tok',
    accessTokenExpiresAt: Date.now() + 600_000,
  });
  await playerStore.getState().playList([track(1), track(2)], 0);
  playerStore.setState({ status });
}

afterEach(async () => {
  await playerStore.getState().reset();
  jest.clearAllMocks();
});

describe('time formatting', () => {
  it('formats and speaks durations', () => {
    expect(formatTime(84)).toBe('1:24');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(null)).toBe('–:––');
    expect(spokenTime(84)).toBe('1 minuto e 24 segundos');
    expect(spokenTime(1)).toBe('1 segundo');
  });

  it('maps engine states', () => {
    expect(toEngineState('buffering' as never)).toBe('buffering');
    expect(toEngineState('ready' as never)).toBe('paused');
    expect(toEngineState(undefined)).toBe('idle');
  });
});

describe('MiniPlayer (T11)', () => {
  it('is hidden with an empty queue', async () => {
    await render(<MiniPlayer />);
    expect(screen.queryByTestId('mini-player')).toBeNull();
  });

  it('shows the current track and controls playback', async () => {
    await playing();
    await render(<MiniPlayer />);
    expect(screen.getByText('Synthetic Track 1')).toBeTruthy();
    expect(TrackPlayer.load).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );

    await fireEvent.press(screen.getByLabelText('Pausar'));
    expect(TrackPlayer.pause).toHaveBeenCalled();
    expect(screen.getByLabelText('Tocar')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Próxima'));
    expect(screen.getByText('Synthetic Track 2')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('mini-player-open'));
    expect(mockPush).toHaveBeenCalledWith('/player');
  });
});

describe('PlayerScreen (T12)', () => {
  it('shows the track, progress and accessible controls', async () => {
    await playing();
    await render(<PlayerScreen />);
    expect(screen.getByTestId('player-title')).toHaveTextContent('Synthetic Track 1');
    expect(screen.getByText('1:24')).toBeTruthy();
    expect(screen.getByText('3:41')).toBeTruthy();
    expect(screen.getByTestId('player-seek').props.accessibilityValue).toEqual({
      text: '1 minuto e 24 segundos de 3 minutos e 41 segundos',
    });

    await fireEvent.press(screen.getByTestId('player-shuffle'));
    expect(screen.getByLabelText('Ordem aleatória: ligada')).toBeSelected();
    await fireEvent.press(screen.getByTestId('player-repeat'));
    expect(screen.getByLabelText('Repetir: toda a fila')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Avançar 15 s'));
    expect(TrackPlayer.seekTo).toHaveBeenCalledWith(15);

    await fireEvent(screen.getByTestId('player-volume'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(playerStore.getState().volume).toBeCloseTo(0.9);

    await fireEvent.press(screen.getByLabelText('Minimizar player'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows loading and buffering states', async () => {
    await playing('loading');
    await render(<PlayerScreen />);
    expect(screen.getByText('Carregando faixa…')).toBeTruthy();
    expect(screen.getAllByText('–:––')).toHaveLength(2);
    playerStore.setState({ status: 'buffering' });
    expect(await screen.findByText('Armazenando em buffer…')).toBeTruthy();
  });

  it('shows the playback error with a retry', async () => {
    await playing('error');
    await render(<PlayerScreen />);
    expect(screen.getByText('Não foi possível reproduzir')).toBeTruthy();
    const loads = (TrackPlayer.load as jest.Mock).mock.calls.length;
    await fireEvent.press(screen.getByLabelText('Tentar de novo'));
    expect((TrackPlayer.load as jest.Mock).mock.calls.length).toBe(loads + 1);
  });
});
