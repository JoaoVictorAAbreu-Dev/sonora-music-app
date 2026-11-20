import { SearchScreen } from '@/features/catalog/SearchScreen';
import { playerStore } from '@/features/player';

/** T06 Buscar. */
export default function Search() {
  return (
    <SearchScreen
      onPlay={(track, list) => void playerStore.getState().playList(list, list.indexOf(track))}
    />
  );
}
