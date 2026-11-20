import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SearchScreen } from '@/features/catalog/SearchScreen';
import { useRecentSearches } from '@/features/catalog/recent-searches';
import { authStore } from '@/lib/auth/store';
import { json } from './fixtures';
import { searchResult } from './catalog-fixtures';

type Handler = (url: URL) => Response | Promise<Response>;
let handler: Handler;
const fetchMock = jest.fn((input: string | URL) =>
  Promise.resolve(handler(new URL(String(input)))),
);

beforeAll(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
beforeEach(() => {
  fetchMock.mockClear();
  useRecentSearches.setState({ items: [] });
  authStore.setState({ status: 'signedIn', accessToken: 'access-token' });
  handler = (url) => {
    const q = url.searchParams.get('q') ?? '';
    if (q === 'xqzvkpl') return json(200, searchResult(q, { tracks: 0, albums: 0, artists: 0 }));
    return json(200, searchResult(q));
  };
});

async function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <SearchScreen />
    </QueryClientProvider>,
  );
}

const type = (text: string) => fireEvent.changeText(screen.getByTestId('search-input'), text);

describe('Search screen (T06)', () => {
  it('starts with genres and no recent searches', async () => {
    await renderSearch();
    expect(screen.getByTestId('search-initial')).toBeTruthy();
    expect(screen.getByLabelText('Explorar Pop')).toBeTruthy();
    expect(screen.queryByText('Buscas recentes')).toBeNull();
  });

  it('goes typing → loading/results after the debounce, sending the token', async () => {
    await renderSearch();
    await type('ambient');
    expect(screen.getByTestId('search-typing')).toBeTruthy();
    expect(screen.getByTestId('suggestion-current')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    expect(await screen.findByTestId('search-results', {}, { timeout: 2000 })).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/v1/search?q=ambient&type=all');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');

    // "Tudo" previews 4 tracks; "Ver tudo" switches to the Músicas filter with all of them.
    expect(screen.getAllByTestId(/^result-track-/)).toHaveLength(4);
    await fireEvent.press(screen.getByTestId('see-all-tracks'));
    expect(await screen.findByTestId('result-track-6', {}, { timeout: 2000 })).toBeTruthy();
    expect(screen.getByTestId('filter-tracks')).toBeSelected();
  });

  it('records successful searches as recent and runs them again', async () => {
    await renderSearch();
    await type('lo-fi');
    await screen.findByTestId('search-results', {}, { timeout: 2000 });
    expect(useRecentSearches.getState().items).toEqual(['lo-fi']);

    await type('');
    expect(screen.getByText('Buscas recentes')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Buscar lo-fi'));
    expect(await screen.findByTestId('search-results', {}, { timeout: 2000 })).toBeTruthy();

    await type('');
    await fireEvent.press(screen.getByLabelText('Remover lo-fi das buscas recentes'));
    expect(useRecentSearches.getState().items).toEqual([]);
  });

  it('shows the empty state and clears the search', async () => {
    await renderSearch();
    await type('xqzvkpl');
    expect(
      await screen.findByText('Nenhum resultado para “xqzvkpl”', {}, { timeout: 2000 }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Limpar busca'));
    expect(screen.getByTestId('search-initial')).toBeTruthy();
    expect(useRecentSearches.getState().items).toEqual([]); // empty searches are not recorded
  });

  it('shows the error state and recovers with "Tentar de novo"', async () => {
    handler = () => json(502, { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'down' } });
    await renderSearch();
    await type('jazz');
    expect(await screen.findByText('Não foi possível buscar', {}, { timeout: 2000 })).toBeTruthy();

    handler = (url) => json(200, searchResult(url.searchParams.get('q') ?? ''));
    await fireEvent.press(screen.getByLabelText('Tentar de novo'));
    expect(await screen.findByTestId('search-results', {}, { timeout: 2000 })).toBeTruthy();
  });

  it('runs a genre search right away', async () => {
    await renderSearch();
    await fireEvent.press(screen.getByLabelText('Explorar Eletrônica'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0]![0])).toContain('q=electronic');
    await act(async () => undefined);
  });
});
