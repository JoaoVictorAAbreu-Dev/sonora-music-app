/** In-memory stand-in for the Jamendo API v3 with synthetic data only. */
export const FAKE_CLIENT_ID = 'test-client-id-0000';

const track = (id: number, extra: Record<string, unknown> = {}) => ({
  id: String(id),
  name: `Synthetic Track ${id}`,
  duration: 180 + id,
  artist_id: '900',
  artist_name: 'Fixture Artist',
  album_id: '500',
  album_name: 'Fixture Album',
  image: `https://images.example.test/track/${id}.jpg`,
  album_image: 'https://images.example.test/album/500.jpg',
  audio: `https://audio.example.test/stream?trackid=${id}&from=app-${FAKE_CLIENT_ID}`,
  license_ccurl: 'https://creativecommons.org/licenses/by/3.0/',
  ...extra,
});

const album = (id: number) => ({
  id: String(id),
  name: `Fixture Album ${id}`,
  artist_id: '900',
  artist_name: 'Fixture Artist',
  image: `https://images.example.test/album/${id}.jpg`,
  releasedate: '2024-05-01',
});

export type Mode = 'ok' | 'network' | 'http500' | 'failed' | 'hang';

export function fakeJamendo() {
  const calls: URL[] = [];
  let mode: Mode = 'ok';

  const envelope = (results: unknown[]) => ({
    headers: { status: 'success', code: 0, error_message: '', results_count: results.length },
    results,
  });

  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push(url);
    if (mode === 'network') throw new TypeError('fetch failed');
    if (mode === 'hang') {
      return new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      );
    }
    if (mode === 'http500') return new Response('oops', { status: 500 });
    if (mode === 'failed') {
      return Response.json({
        headers: { status: 'failed', code: 5, error_message: 'bad' },
        results: [],
      });
    }
    const p = url.searchParams;
    const path = url.pathname.replace(/^.*\/v3\.0/, '');
    let results: unknown[] = [];
    if (path === '/tracks/') {
      if (p.get('id')) results = p.get('id') === '404' ? [] : [track(Number(p.get('id')))];
      else if (p.get('search'))
        results = [track(1), track(2), { id: 'broken' } /* malformed item is skipped */];
      else results = [track(10), track(11), track(12)];
    } else if (path === '/albums/') {
      results = [album(500), album(501)];
    } else if (path === '/albums/tracks/') {
      results =
        p.get('id') === '404'
          ? []
          : [
              {
                ...album(Number(p.get('id'))),
                tracks: [
                  {
                    id: '30',
                    name: 'Side A',
                    duration: 200,
                    audio: 'https://audio.example.test/30',
                  },
                  {
                    id: '31',
                    name: 'Side B',
                    duration: 210,
                    audio: 'https://audio.example.test/31',
                  },
                ],
              },
            ];
    } else if (path === '/artists/') {
      results =
        p.get('id') === '404'
          ? []
          : [{ id: p.get('id') ?? '900', name: 'Fixture Artist', image: '' }];
    }
    return Response.json(envelope(results));
  }) as typeof fetch;

  return {
    fetchImpl,
    calls,
    setMode: (m: Mode) => {
      mode = m;
    },
    reset: () => {
      calls.length = 0;
      mode = 'ok';
    },
  };
}
