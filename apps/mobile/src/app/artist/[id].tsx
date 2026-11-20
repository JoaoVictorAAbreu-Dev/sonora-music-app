import { useLocalSearchParams } from 'expo-router';
import { ArtistScreen } from '@/features/catalog/CollectionScreens';

export default function Artist() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ArtistScreen id={id} />;
}
