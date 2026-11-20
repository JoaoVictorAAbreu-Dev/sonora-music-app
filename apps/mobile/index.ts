/**
 * App entry: registers the audio playback service (lock screen / notification controls)
 * before handing over to Expo Router.
 */
import TrackPlayer from 'react-native-track-player';
import { playbackService } from './src/features/player/service';
import 'expo-router/entry';

TrackPlayer.registerPlaybackService(() => playbackService);
