import TrackPlayer, { Event } from 'react-native-track-player';
import { playerStore } from './index';
import { JUMP_SECONDS } from './rntp-engine';

/**
 * Playback service: lock screen, notification, headphones and car controls.
 * Registered in the app entry (index.ts) before the router starts.
 */
export async function playbackService() {
  const player = () => playerStore.getState();
  TrackPlayer.addEventListener(Event.RemotePlay, () => void TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => void TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => void player().reset());
  TrackPlayer.addEventListener(Event.RemoteNext, () => void player().next());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => void player().previous());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => void player().seek(e.position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => void player().seekBy(JUMP_SECONDS));
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => void player().seekBy(-JUMP_SECONDS));
}
