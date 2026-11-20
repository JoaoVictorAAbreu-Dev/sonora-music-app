/** What the player store needs from the audio engine. The app uses RNTP; tests use a fake. */
export interface EngineTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  headers: Record<string, string>;
}

export type EngineState =
  'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlayerEngine {
  setup(): Promise<void>;
  /** Replaces whatever is loaded with this single track (the app manages the queue itself). */
  load(track: EngineTrack): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seekTo(seconds: number): Promise<void>;
  getPosition(): Promise<number>;
  setVolume(level: number): Promise<void>;
}
