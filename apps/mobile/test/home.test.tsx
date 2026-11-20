import { fireEvent, render, screen } from '@testing-library/react-native';
import { HomeContent, greeting } from '@/features/catalog/HomeContent';
import { ApiRequestError } from '@/lib/api/client';
import { shouldRetry } from '@/lib/query';
import { album, track } from './catalog-fixtures';

const base = { refreshing: false, onRefresh: jest.fn() };

describe('Home (T05)', () => {
  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe('Bom dia');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Boa tarde');
    expect(greeting(new Date(2026, 0, 1, 21))).toBe('Boa noite');
  });

  it('shows a skeleton while loading', async () => {
    await render(<HomeContent {...base} data={undefined} status="pending" />);
    expect(screen.getByTestId('loading')).toBeBusy();
  });

  it('shows the sections and hides "Continuar ouvindo" without history', async () => {
    await render(
      <HomeContent
        {...base}
        status="success"
        data={{
          continueListening: [],
          madeForYou: [album(1), album(2)],
          popular: [track(1), track(2)],
        }}
      />,
    );
    expect(screen.queryByTestId('section-continue')).toBeNull();
    expect(screen.getByTestId('section-made-for-you')).toBeTruthy();
    expect(screen.getByText('Synthetic Track 2')).toBeTruthy();
  });

  it('plays from a list when a track is pressed', async () => {
    const onPlay = jest.fn();
    const popular = [track(1), track(2)];
    await render(
      <HomeContent
        {...base}
        status="success"
        onPlay={onPlay}
        data={{ continueListening: [track(9)], madeForYou: [], popular }}
      />,
    );
    await fireEvent.press(screen.getByTestId('track-2'));
    expect(onPlay).toHaveBeenCalledWith(popular[1], popular);
  });

  it('offers a retry on errors with a network-specific message', async () => {
    const onRefresh = jest.fn();
    await render(
      <HomeContent
        refreshing={false}
        onRefresh={onRefresh}
        data={undefined}
        status="error"
        error={new ApiRequestError('NETWORK_ERROR', 'offline', 0)}
      />,
    );
    expect(screen.getByText('Sem conexão')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Tentar de novo'));
    expect(onRefresh).toHaveBeenCalled();
  });
});

describe('query retry policy', () => {
  it('retries only transient errors, at most twice', () => {
    expect(shouldRetry(0, new ApiRequestError('NETWORK_ERROR', 'x', 0))).toBe(true);
    expect(shouldRetry(1, new ApiRequestError('UPSTREAM_UNAVAILABLE', 'x', 502))).toBe(true);
    expect(shouldRetry(2, new ApiRequestError('NETWORK_ERROR', 'x', 0))).toBe(false);
    expect(shouldRetry(0, new ApiRequestError('UNAUTHORIZED', 'x', 401))).toBe(false);
    expect(shouldRetry(0, new Error('boom'))).toBe(false);
  });
});
