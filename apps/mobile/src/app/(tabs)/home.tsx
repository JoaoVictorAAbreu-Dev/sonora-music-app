import { HomeContent } from '@/features/catalog/HomeContent';
import { openAlbum } from '@/features/catalog/CollectionScreens';
import { useHome } from '@/features/catalog/api';
import { playerStore } from '@/features/player';
import { openTrackOptions } from '@/features/library/track-actions';

/** T05 Início. */
export default function HomeScreen() {
  const home = useHome();
  return (
    <HomeContent
      data={home.data}
      status={home.status}
      error={home.error}
      refreshing={home.isRefetching}
      onRefresh={() => void home.refetch()}
      onPlay={(track, list) => void playerStore.getState().playList(list, list.indexOf(track))}
      onMore={openTrackOptions}
      onOpenAlbum={openAlbum}
    />
  );
}
