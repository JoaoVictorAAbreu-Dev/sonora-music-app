import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  IOSCategory,
  State,
  useProgress,
} from 'react-native-track-player';
import type { EngineState, PlayerEngine } from './engine';

/** Seconds for the ±15 s buttons, lock screen included (T12 "Pular 15 s"). */
export const JUMP_SECONDS = 15;

let setupPromise: Promise<void> | null = null;

/** react-native-track-player adapter. Needs a development build (not Expo Go). */
export const rntpEngine: PlayerEngine = {
  setup() {
    setupPromise ??= (async () => {
      // Playback category keeps audio going in the background and with the silent switch on.
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
        iosCategory: IOSCategory.Playback,
      });
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.JumpForward,
          Capability.JumpBackward,
          Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
        forwardJumpInterval: JUMP_SECONDS,
        backwardJumpInterval: JUMP_SECONDS,
        progressUpdateEventInterval: 1,
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
      });
    })().catch((err: unknown) => {
      setupPromise = null; // allow a retry
      throw err;
    });
    return setupPromise;
  },
  async load(track) {
    await TrackPlayer.load({
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      duration: track.duration,
      headers: track.headers,
    });
  },
  play: () => TrackPlayer.play(),
  pause: () => TrackPlayer.pause(),
  stop: () => TrackPlayer.stop(),
  seekTo: (s) => TrackPlayer.seekTo(s),
  getPosition: () => TrackPlayer.getPosition(),
  setVolume: (v) => TrackPlayer.setVolume(v),
};

export function toEngineState(state: State | undefined): EngineState {
  switch (state) {
    case State.Loading:
      return 'loading';
    case State.Buffering:
      return 'buffering';
    case State.Playing:
      return 'playing';
    case State.Paused:
    case State.Ready:
    case State.Stopped:
      return 'paused';
    case State.Ended:
      return 'ended';
    case State.Error:
      return 'error';
    default:
      return 'idle';
  }
}

/** Subscribes the store to engine events (in-app; the service handles remote controls). */
export function subscribeEngineEvents(handlers: {
  onState(state: EngineState): void;
  onError(message: string): void;
  onEnded(): void;
  onProgress(positionSeconds: number): void;
}) {
  const subs = [
    TrackPlayer.addEventListener(Event.PlaybackState, (e) =>
      handlers.onState(toEngineState(e.state)),
    ),
    TrackPlayer.addEventListener(Event.PlaybackError, (e) => handlers.onError(e.message)),
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => handlers.onEnded()),
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) =>
      handlers.onProgress(e.position),
    ),
  ];
  return () => subs.forEach((s) => s.remove());
}

/** Position/duration in seconds, updated about once per second. */
export function usePlaybackProgress() {
  const { position, duration, buffered } = useProgress(1000);
  return { position, duration, buffered };
}
