import { useLocalSearchParams } from 'expo-router';
import { PlaylistScreen } from '@/features/library/PlaylistScreen';

export default function Playlist() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaylistScreen id={id} />;
}
