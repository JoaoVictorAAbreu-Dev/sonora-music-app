import type { EngineTrack, PlayerEngine } from '@/features/player/engine';
import { createPlayerStore, shuffled } from '@/features/player/store';
import { track } from './catalog-fixtures';

function fakeEngine() {
  const loaded: EngineTrack[] = [];
  let position = 0;
  const engine: PlayerEngine & { loaded: EngineTrack[]; setPosition(p: number): void } = {
    loaded,
    setPosition: (p) => {
      position = p;
    },
    setup: jest.fn(async () => undefined),
    load: jest.fn(async (t: EngineTrack) => {
      loaded.push(t);
      position = 0;
    }),
    play: jest.fn(async () => undefined),
    pause: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    seekTo: jest.fn(async (s: number) => {
      position = s;
    }),
    getPosition: jest.fn(async () => position),
    setVolume: jest.fn(async () => undefined),
  };
  return engine;
}

const list = [track(1), track(2), track(3), track(4)];

function setup(token: string | null = 'tok') {
  const engine = fakeEngine();
  const reportPlay = jest.fn(async () => undefined);
  const store = createPlayerStore({
    engine,
    streamUrl: (p) => `https://api.test${p}`,
    getAccessToken: async () => token,
    reportPlay,
    random: () => 0, // deterministic shuffle
  });
  return { engine, store, reportPlay, s: () => store.getState() };
}

const currentId = (s: () => { current(): { id: string } | null }) => s().current()?.id;

describe('player store', () => {
  it('plays from a list with the stream URL and a bearer token', async () => {
    const { engine, s } = setup();
    await s().playList(list, 1);
    expect(currentId(s)).toBe('2');
    expect(engine.loaded[0]).toMatchObject({
      id: '2',
      url: 'https://api.test/v1/tracks/2/stream',
      headers: { Authorization: 'Bearer tok' },
      artist: 'Fixture Artist',
    });
    expect(engine.play).toHaveBeenCalled();
  });

  it('fails into an error state when there is no session', async () => {
    const { engine, s } = setup(null);
    await s().playList(list, 0);
    expect(s().status).toBe('error');
    expect(engine.play).not.toHaveBeenCalled();
  });

  it('moves next/previous and stops at the end without repeat', async () => {
    const { engine, s } = setup();
    await s().playList(list, 2);
    await s().next();
    expect(currentId(s)).toBe('4');
    await s().next(); // last track, repeat off
    expect(currentId(s)).toBe('4');
    expect(s().status).toBe('paused');
    expect(engine.seekTo).toHaveBeenLastCalledWith(0);
    await s().previous();
    expect(currentId(s)).toBe('3');
  });

  it('restarts the track on "previous" after a few seconds of playback', async () => {
    const { engine, s } = setup();
    await s().playList(list, 2);
    engine.setPosition(42);
    await s().previous();
    expect(currentId(s)).toBe('3');
    expect(engine.seekTo).toHaveBeenLastCalledWith(0);
  });

  it('wraps around with repeat all and replays with repeat one', async () => {
    const { engine, s } = setup();
    await s().playList(list, 3);
    s().cycleRepeat();
    expect(s().repeat).toBe('all');
    await s().next();
    expect(currentId(s)).toBe('1');
    await s().previous(); // first track + repeat all → last
    expect(currentId(s)).toBe('4');

    s().cycleRepeat();
    expect(s().repeat).toBe('one');
    const loads = engine.loaded.length;
    await s().onTrackEnded();
    expect(currentId(s)).toBe('4');
    expect(engine.loaded).toHaveLength(loads + 1);
    s().cycleRepeat();
    expect(s().repeat).toBe('off');
  });

  it('advances when a track ends', async () => {
    const { s } = setup();
    await s().playList(list, 0);
    await s().onTrackEnded();
    expect(currentId(s)).toBe('2');
  });

  it('shuffles around the current track and restores the order', async () => {
    const { s } = setup();
    await s().playList(list, 1);
    s().toggleShuffle();
    expect(s().shuffle).toBe(true);
    expect(s().queue[0]!.id).toBe('2'); // current stays first
    expect(
      s()
        .queue.map((t) => t.id)
        .sort(),
    ).toEqual(['1', '2', '3', '4']);
    s().toggleShuffle();
    expect(s().queue.map((t) => t.id)).toEqual(['1', '2', '3', '4']);
    expect(currentId(s)).toBe('2');
  });

  it('starts a new list shuffled when shuffle is on', async () => {
    const { s } = setup();
    s().toggleShuffle();
    await s().playList(list, 2);
    expect(currentId(s)).toBe('3');
    expect(s().index).toBe(0);
  });

  it('toggles play/pause and retries after an error', async () => {
    const { engine, s } = setup();
    await s().playList(list, 0);
    s().onEngineState('playing');
    await s().togglePlay();
    expect(engine.pause).toHaveBeenCalled();
    expect(s().status).toBe('paused');
    await s().togglePlay();
    expect(engine.play).toHaveBeenCalledTimes(2);

    s().onEngineError('network');
    expect(s()).toMatchObject({ status: 'error', error: 'network' });
    const loads = engine.loaded.length;
    await s().retry();
    expect(engine.loaded).toHaveLength(loads + 1);
  });

  it('seeks within bounds and clamps the volume', async () => {
    const { engine, s } = setup();
    await s().playList([track(1)], 0); // 180 s long
    engine.setPosition(170);
    await s().seekBy(15);
    expect(engine.seekTo).toHaveBeenLastCalledWith(180);
    engine.setPosition(5);
    await s().seekBy(-15);
    expect(engine.seekTo).toHaveBeenLastCalledWith(0);
    await s().setVolume(1.5);
    expect(s().volume).toBe(1);
    expect(engine.setVolume).toHaveBeenLastCalledWith(1);
  });

  it('forgets everything on reset', async () => {
    const { engine, s } = setup();
    await s().playList(list, 0);
    await s().reset();
    expect(s()).toMatchObject({ queue: [], status: 'idle' });
    expect(s().current()).toBeNull();
    expect(engine.stop).toHaveBeenCalled();
  });
});

describe('queue editing', () => {
  const ids = (s: () => { queue: { id: string }[] }) => s().queue.map((t) => t.id);

  it('moves upcoming tracks and keeps the current one', async () => {
    const { s } = setup();
    await s().playList(list, 0);
    s().moveInQueue(3, 1);
    expect(ids(s)).toEqual(['1', '4', '2', '3']);
    expect(currentId(s)).toBe('1');
    s().moveInQueue(0, 2); // moving the current track updates the index
    expect(ids(s)).toEqual(['4', '2', '1', '3']);
    expect(s().index).toBe(2);
    s().moveInQueue(0, 99); // out of range: ignored
    expect(ids(s)).toEqual(['4', '2', '1', '3']);
  });

  it('removes tracks before, after and at the current position', async () => {
    const { engine, s } = setup();
    await s().playList(list, 1);
    await s().removeFromQueue(3);
    expect(ids(s)).toEqual(['1', '2', '3']);
    await s().removeFromQueue(0);
    expect(ids(s)).toEqual(['2', '3']);
    expect(currentId(s)).toBe('2');
    const loads = engine.loaded.length;
    await s().removeFromQueue(0); // the playing track → next one starts
    expect(currentId(s)).toBe('3');
    expect(engine.loaded).toHaveLength(loads + 1);
    await s().removeFromQueue(0); // last one → player resets
    expect(s().queue).toEqual([]);
  });

  it('clears what comes next and appends tracks', async () => {
    const { s } = setup();
    await s().playList(list, 1);
    s().clearUpcoming();
    expect(ids(s)).toEqual(['1', '2']);
    s().addToQueue(track(9));
    expect(ids(s)).toEqual(['1', '2', '9']);
  });

  it('adding to an empty queue starts playing', async () => {
    const { engine, s } = setup();
    s().addToQueue(track(7));
    await new Promise<void>((r) => setImmediate(() => r()));
    expect(currentId(s)).toBe('7');
    expect(engine.play).toHaveBeenCalled();
  });
});

describe('play reporting', () => {
  it('reports once after 30 s of listening', async () => {
    const { s, reportPlay } = setup();
    await s().playList(list, 0); // 181 s track
    s().onProgress(10);
    expect(reportPlay).not.toHaveBeenCalled();
    s().onProgress(30);
    s().onProgress(31);
    expect(reportPlay).toHaveBeenCalledTimes(1);
    expect(reportPlay).toHaveBeenCalledWith('1');
    await s().next();
    s().onProgress(45);
    expect(reportPlay).toHaveBeenLastCalledWith('2');
  });

  it('uses half the length for short tracks and reports a replay again', async () => {
    const { s, reportPlay } = setup();
    const short = { ...track(5), durationSeconds: 20 };
    await s().playList([short], 0);
    s().onProgress(10);
    expect(reportPlay).toHaveBeenCalledTimes(1);
    s().cycleRepeat();
    s().cycleRepeat(); // repeat one
    await s().onTrackEnded();
    s().onProgress(12);
    expect(reportPlay).toHaveBeenCalledTimes(2);
  });
});

describe('shuffled', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffled(input, () => 0.5);
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
