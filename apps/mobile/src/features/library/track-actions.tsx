import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { create } from 'zustand';
import type { PlaylistSummary, Track } from '@sonora/shared';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { Artwork } from '@/components/catalog/Artwork';
import { playerStore } from '@/features/player';
import { showToast } from '@/features/ui/toast';
import { ApiRequestError } from '@/lib/api/client';
import { layout, radius, spacing } from '@/theme';
import {
  libraryApi,
  useFavoriteIds,
  useInvalidatePlaylists,
  usePlaylists,
  useToggleFavorite,
} from './api';

interface TrackActionsState {
  track: Track | null;
  mode: 'options' | 'playlists' | null;
  open(track: Track): void;
  openPlaylists(track: Track): void;
  close(): void;
}

/** Which track's "Mais opções" sheet is open (one at a time, app-wide). */
export const useTrackActions = create<TrackActionsState>()((set) => ({
  track: null,
  mode: null,
  open: (track) => set({ track, mode: 'options' }),
  openPlaylists: (track) => set({ track, mode: 'playlists' }),
  close: () => set({ track: null, mode: null }),
}));

export const openTrackOptions = (track: Track) => useTrackActions.getState().open(track);

/** Rendered once in the root layout. */
export function TrackActionsHost() {
  const { track, mode, close, openPlaylists } = useTrackActions();
  if (!track) return null;
  return mode === 'playlists' ? (
    <AddToPlaylistSheet track={track} onClose={close} />
  ) : (
    <TrackOptionsSheet track={track} onClose={close} onAddToPlaylist={() => openPlaylists(track)} />
  );
}

function TrackOptionsSheet({
  track,
  onClose,
  onAddToPlaylist,
}: {
  track: Track;
  onClose(): void;
  onAddToPlaylist(): void;
}) {
  const ids = useFavoriteIds();
  const toggle = useToggleFavorite();
  const favorite = ids.data?.has(track.id) ?? false;
  return (
    <BottomSheet
      visible
      title={track.title}
      subtitle={track.artist.name}
      onClose={onClose}
      testID="track-options"
    >
      <SheetAction
        testID="option-favorite"
        icon={<Icon name="heart" filled={favorite} tint={favorite ? 'action' : 'default'} />}
        label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
        onPress={() => {
          toggle.mutate({ trackId: track.id, on: !favorite });
          showToast(favorite ? 'Removida dos favoritos' : 'Adicionada aos favoritos');
          onClose();
        }}
      />
      <SheetAction
        testID="option-queue"
        icon={<Icon name="queue" />}
        label="Adicionar à fila"
        onPress={() => {
          playerStore.getState().addToQueue(track);
          showToast('Adicionada à fila');
          onClose();
        }}
      />
      <SheetAction
        testID="option-playlist"
        icon={<Icon name="plus" />}
        label="Adicionar à playlist"
        onPress={onAddToPlaylist}
      />
    </BottomSheet>
  );
}

function AddToPlaylistSheet({ track, onClose }: { track: Track; onClose(): void }) {
  const playlists = usePlaylists();
  const invalidate = useInvalidatePlaylists();
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: (p: PlaylistSummary) => libraryApi.addToPlaylist(p.id, track.id),
    onSuccess: (_d, p) => {
      invalidate(p.id);
      showToast(`Adicionada a “${p.name}”`);
      onClose();
    },
    onError: (err, p) => {
      if (err instanceof ApiRequestError && err.code === 'CONFLICT') setDuplicate(p.name);
      else showToast('Não foi possível adicionar. Tente de novo.');
    },
  });

  return (
    <BottomSheet visible title="Adicionar à playlist" onClose={onClose} testID="add-to-playlist">
      {(playlists.data?.playlists ?? []).map((p) => (
        <Pressable
          key={p.id}
          testID={`add-to-${p.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${p.trackCount} faixas`}
          onPress={() => add.mutate(p)}
          style={styles.row}
        >
          <Artwork uri={p.artworkUrl} size={layout.rowArtworkSize} radius={radius.sm} />
          <View style={styles.flex}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {p.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {`${p.trackCount} faixas`}
            </Text>
          </View>
        </Pressable>
      ))}
      {playlists.data && playlists.data.playlists.length === 0 ? (
        <Text tone="secondary" style={styles.margin}>
          Você ainda não tem playlists.
        </Text>
      ) : null}
      {duplicate ? (
        <View style={styles.margin}>
          <FieldError
            message={`Esta faixa já está em “${duplicate}”.`}
            testID="duplicate-warning"
          />
        </View>
      ) : null}
      <View style={styles.footer}>
        <Button
          variant="secondary"
          label="+ Nova playlist"
          onPress={() => {
            onClose();
            router.push({ pathname: '/playlist-edit', params: { addTrack: track.id } });
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.listRowHeight,
    paddingHorizontal: layout.screenMargin,
  },
  flex: { flex: 1 },
  margin: { paddingHorizontal: layout.screenMargin, paddingVertical: spacing.sm },
  footer: { paddingHorizontal: layout.screenMargin, paddingTop: spacing.md },
});
