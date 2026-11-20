import { useLocalSearchParams } from 'expo-router';
import { AlbumScreen } from '@/features/catalog/CollectionScreens';

export default function Album() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AlbumScreen id={id} />;
}
