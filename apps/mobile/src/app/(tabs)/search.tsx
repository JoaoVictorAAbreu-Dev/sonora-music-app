import { SearchScreen } from '@/features/catalog/SearchScreen';
import { playerStore } from '@/features/player';
import { openTrackOptions } from '@/features/library/track-actions';

/** T06 Buscar. */
export default function Search() {
  return (
    <SearchScreen
      onPlay={(track, list) => void playerStore.getState().playList(list, list.indexOf(track))}
      onMore={openTrackOptions}
    />
  );
}
