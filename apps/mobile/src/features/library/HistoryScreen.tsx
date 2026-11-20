import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { LoadingList } from '@/components/catalog/Skeleton';
import { TrackRow } from '@/components/catalog/TrackRow';
import { errorCopy } from '@/features/catalog/copy';
import { playerStore } from '@/features/player';
import { useHistory } from '@/features/player/history-api';
import { color, spacing } from '@/theme';
import { openTrackOptions } from './track-actions';

/** Biblioteca › Recentes: listening history, newest first, paged. */
export function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const history = useHistory();
  const entries = history.data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]} testID="screen-history">
      <PageHeader title="Recentes" />
      {history.isPending ? <LoadingList /> : null}
      {history.isError ? (
        <EmptyState
          icon="queue"
          title={errorCopy(history.error).title}
          description={errorCopy(history.error).description}
          action={{ label: 'Tentar de novo', onPress: () => void history.refetch() }}
        />
      ) : null}
      {history.isSuccess && entries.length === 0 ? (
        <EmptyState
          testID="history-empty"
          icon="queue"
          title="Nada tocado ainda"
          description="As músicas que você ouvir aparecem aqui."
        />
      ) : null}
      {entries.length > 0 ? (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          onEndReached={() => history.hasNextPage && void history.fetchNextPage()}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
          renderItem={({ item }) => {
            const t = item.track;
            return t ? (
              <TrackRow
                track={t}
                testID={`history-${item.id}`}
                onPress={() => void playerStore.getState().playList([t], 0)}
                onMore={() => openTrackOptions(t)}
              />
            ) : (
              <TrackRow
                state="unavailable"
                track={{
                  id: item.trackId,
                  title: 'Faixa indisponível',
                  artist: { id: '0', name: 'Removida do catálogo' },
                  album: null,
                  durationSeconds: 0,
                  artworkUrl: null,
                  streamPath: `/v1/tracks/${item.trackId}/stream`,
                  licenseUrl: null,
                }}
              />
            );
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base, gap: spacing.lg },
});
