import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Track } from '@sonora/shared';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Text } from '@/components/Text';
import { LoadingList } from '@/components/catalog/Skeleton';
import { TrackRow } from '@/components/catalog/TrackRow';
import { errorCopy } from '@/features/catalog/copy';
import { playerStore } from '@/features/player';
import { color, layout, spacing } from '@/theme';
import { useFavorites } from './api';
import { openTrackOptions } from './track-actions';

/** T14 Favoritos: count, "Tocar tudo" and the favorited tracks (newest first, paged). */
export function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();
  const entries = favorites.data?.pages.flatMap((p) => p.entries) ?? [];
  const total = favorites.data?.pages[0]?.total ?? 0;
  const tracks = entries.flatMap((e) => (e.track ? [e.track] : []));
  const play = (t: Track) => void playerStore.getState().playList(tracks, tracks.indexOf(t));

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]} testID="screen-favorites">
      <PageHeader title="Favoritos" />
      {favorites.isPending ? <LoadingList /> : null}
      {favorites.isError ? (
        <EmptyState
          icon="queue"
          title={errorCopy(favorites.error).title}
          description={errorCopy(favorites.error).description}
          action={{ label: 'Tentar de novo', onPress: () => void favorites.refetch() }}
        />
      ) : null}
      {favorites.isSuccess && total === 0 ? (
        <EmptyState
          testID="favorites-empty"
          icon="heart"
          title="Nenhum favorito ainda"
          description="Toque no coração de uma música para salvá-la aqui."
        />
      ) : null}
      {favorites.isSuccess && total > 0 ? (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.trackId}
          onEndReached={() => favorites.hasNextPage && void favorites.fetchNextPage()}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
          ListHeaderComponent={
            <View style={styles.top}>
              <Text tone="secondary">{`${total} ${total === 1 ? 'faixa' : 'faixas'}`}</Text>
              <Button
                label="Tocar tudo"
                onPress={() => void playerStore.getState().playList(tracks, 0)}
                disabled={tracks.length === 0}
                testID="favorites-play-all"
              />
            </View>
          }
          renderItem={({ item }) => {
            const t = item.track;
            return t ? (
              <TrackRow
                track={t}
                testID={`favorite-${item.trackId}`}
                onPress={() => play(t)}
                onMore={() => openTrackOptions(t)}
              />
            ) : null;
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base, gap: spacing.lg },
  top: { gap: spacing.lg, paddingHorizontal: layout.screenMargin, paddingBottom: spacing.lg },
});
