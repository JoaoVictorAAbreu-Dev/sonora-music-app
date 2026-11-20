import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMotion } from '@/hooks/useMotion';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import type { PlaylistEntry, Track } from '@sonora/shared';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { Text } from '@/components/Text';
import { Artwork } from '@/components/catalog/Artwork';
import { LoadingList } from '@/components/catalog/Skeleton';
import { QueueItem } from '@/components/player/QueueItem';
import { errorCopy } from '@/features/catalog/copy';
import { playerStore } from '@/features/player';
import { showToast } from '@/features/ui/toast';
import { color, duration, layout, radius, spacing } from '@/theme';
import { libraryApi, useInvalidatePlaylists, usePlaylist } from './api';

const playable = (entries: PlaylistEntry[]): Track[] =>
  entries.flatMap((e) => (e.track ? [e.track] : []));

/** T10 Playlist: cover, title, "Tocar", tracks (drag/swipe/actions) and the manage sheet. */
export function PlaylistScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const playlist = usePlaylist(id);
  const invalidate = useInvalidatePlaylists();
  const [order, setOrder] = useState<PlaylistEntry[] | null>(null);
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const entries = order ?? playlist.data?.entries ?? [];
  const tracks = playable(entries);

  const reorder = useMutation({
    mutationFn: (next: PlaylistEntry[]) =>
      libraryApi.reorderPlaylist(
        id,
        next.map((e) => e.entryId),
      ),
    onSettled: () => {
      setOrder(null);
      invalidate(id);
    },
    onError: () => showToast('Não foi possível reordenar. Tente de novo.'),
  });
  const remove = useMutation({
    mutationFn: (e: PlaylistEntry) => libraryApi.removeFromPlaylist(id, e.entryId),
    onSuccess: () => showToast('Removida da playlist'),
    onSettled: () => {
      setOrder(null);
      invalidate(id);
    },
  });
  const del = useMutation({
    mutationFn: () => libraryApi.deletePlaylist(id),
    onSuccess: () => {
      invalidate();
      setConfirm(false);
      showToast('Playlist excluída');
      router.back();
    },
  });

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= entries.length) return;
    const next = [...entries];
    const [m] = next.splice(from, 1);
    if (!m) return;
    next.splice(to, 0, m);
    setOrder(next); // optimistic
    reorder.mutate(next);
  };

  const name = playlist.data?.playlist.name ?? '';
  const count = playlist.data?.playlist.trackCount ?? 0;
  const target = drag
    ? Math.min(
        entries.length - 1,
        Math.max(0, drag.from + Math.round(drag.dy / layout.listRowHeight)),
      )
    : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]} testID="screen-playlist">
      <PageHeader
        title=""
        trailing={
          playlist.data ? (
            <IconButton
              icon="more"
              label="Gerenciar playlist"
              onPress={() => setMenu(true)}
              testID="playlist-menu"
            />
          ) : null
        }
      />
      {playlist.isPending ? <LoadingList /> : null}
      {playlist.isError ? (
        <EmptyState
          icon="queue"
          title={errorCopy(playlist.error).title}
          description={errorCopy(playlist.error).description}
          action={{ label: 'Tentar de novo', onPress: () => void playlist.refetch() }}
        />
      ) : null}
      {playlist.data ? (
        <ScrollView
          scrollEnabled={drag === null}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'], gap: spacing.lg }}
        >
          <View style={styles.hero}>
            <Artwork
              uri={playlist.data.playlist.artworkUrl}
              size={layout.playlistCoverSize}
              radius={radius.lg}
            />
            <Text
              variant="display"
              accessibilityRole="header"
              style={styles.center}
              testID="playlist-name"
            >
              {name}
            </Text>
            <Text tone="secondary">{`${count} ${count === 1 ? 'faixa' : 'faixas'} · criada por você`}</Text>
          </View>
          <View style={styles.margin}>
            <Button
              label="Tocar"
              disabled={tracks.length === 0}
              onPress={() => void playerStore.getState().playList(tracks, 0)}
              testID="playlist-play"
            />
          </View>
          {entries.length === 0 ? (
            <EmptyState
              icon="plus"
              title="Playlist vazia"
              description="Busque músicas e use ••• › Adicionar à playlist."
              action={{
                label: 'Buscar músicas',
                variant: 'secondary',
                onPress: () => router.navigate('/search'),
              }}
            />
          ) : null}
          <View>
            {entries.map((e, i) =>
              e.track ? (
                <Animated.View
                  key={e.entryId}
                  layout={motion.listLayout()}
                  exiting={motion.fadeOut(duration.standard)}
                >
                  {target === i && drag && drag.from !== i ? <View style={styles.drop} /> : null}
                  <QueueItem
                    track={e.track}
                    position={i + 1}
                    count={entries.length}
                    dragOffset={drag?.from === i ? drag.dy : null}
                    onDragStart={() => setDrag({ from: i, dy: 0 })}
                    onDragMove={(dy) => setDrag({ from: i, dy })}
                    onDragEnd={() => {
                      if (target !== null) move(i, target);
                      setDrag(null);
                    }}
                    onMove={(dir) => move(i, i + dir)}
                    onRemove={() => {
                      setOrder(entries.filter((x) => x.entryId !== e.entryId));
                      remove.mutate(e);
                    }}
                    onPlay={() => {
                      const t = e.track;
                      if (t) void playerStore.getState().playList(tracks, tracks.indexOf(t));
                    }}
                  />
                </Animated.View>
              ) : null,
            )}
          </View>
        </ScrollView>
      ) : null}

      <BottomSheet
        visible={menu}
        title={name}
        subtitle={`Playlist · ${count} ${count === 1 ? 'música' : 'músicas'}`}
        onClose={() => setMenu(false)}
        testID="playlist-sheet"
      >
        <SheetAction
          icon={<Icon name="plus" />}
          label="Adicionar músicas"
          onPress={() => {
            setMenu(false);
            router.navigate('/search');
          }}
        />
        <SheetAction
          icon={<Icon name="queue" />}
          label="Adicionar à fila"
          onPress={() => {
            tracks.forEach((t) => playerStore.getState().addToQueue(t));
            setMenu(false);
            showToast('Adicionada à fila');
          }}
        />
        <SheetAction
          testID="playlist-edit"
          icon={<Icon name="more" />}
          label="Editar playlist"
          onPress={() => {
            setMenu(false);
            router.push({ pathname: '/playlist-edit', params: { id } });
          }}
        />
        <SheetAction
          testID="playlist-delete"
          icon={<Icon name="close" />}
          label="Excluir playlist"
          destructive
          onPress={() => {
            setMenu(false);
            setConfirm(true);
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        visible={confirm}
        title="Excluir playlist?"
        message={`“${name}” será removida da sua biblioteca. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        busy={del.isPending}
        onConfirm={() => del.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: layout.screenMargin },
  center: { textAlign: 'center' },
  margin: { paddingHorizontal: layout.screenMargin },
  drop: {
    height: layout.progressTrackHeight - 1,
    marginHorizontal: layout.screenMargin,
    borderRadius: radius.sm / 4,
    backgroundColor: color.action.primary,
  },
});
