import { useLocalSearchParams } from 'expo-router';
import { PlaylistEditScreen } from '@/features/library/PlaylistEditScreen';

/** T16: `?id=` edits an existing playlist; `?addTrack=` adds a track after creating. */
export default function PlaylistEdit() {
  const { id, addTrack } = useLocalSearchParams<{ id?: string; addTrack?: string }>();
  return <PlaylistEditScreen id={id} addTrack={addTrack} />;
}
