import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { playlistNameSchema } from '@sonora/shared';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { showToast } from '@/features/ui/toast';
import { ApiRequestError } from '@/lib/api/client';
import { spacing } from '@/theme';
import { libraryApi, useInvalidatePlaylists, usePlaylist } from './api';

function nameError(name: string): string | undefined {
  const r = playlistNameSchema.safeParse(name);
  if (r.success) return undefined;
  return r.error.issues[0]?.message === 'name_too_long'
    ? 'O nome pode ter no máximo 60 caracteres.'
    : 'Dê um nome para a playlist.';
}

/** T16 Criar/editar playlist. `addTrack` adds that track right after creating. */
export function PlaylistEditScreen({ id, addTrack }: { id?: string; addTrack?: string }) {
  const existing = usePlaylist(id ?? '');
  const editing = Boolean(id);
  const invalidate = useInvalidatePlaylists();
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const value = name ?? (editing ? (existing.data?.playlist.name ?? '') : '');

  const save = useMutation({
    mutationFn: async () => {
      if (id) return (await libraryApi.updatePlaylist(id, { name: value })).playlist;
      const { playlist } = await libraryApi.createPlaylist({ name: value });
      if (addTrack) await libraryApi.addToPlaylist(playlist.id, addTrack);
      return playlist;
    },
    onSuccess: (playlist) => {
      invalidate(playlist.id);
      showToast(editing ? 'Playlist atualizada' : 'Playlist criada');
      if (editing) router.back();
      else router.replace(`/playlist/${playlist.id}`);
    },
    onError: (err) => {
      const message =
        err instanceof ApiRequestError && err.code === 'LIMIT_REACHED'
          ? 'Você atingiu o limite de playlists.'
          : 'Não foi possível salvar. Tente de novo.';
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
    },
  });
  const del = useMutation({
    mutationFn: () => libraryApi.deletePlaylist(id ?? ''),
    onSuccess: () => {
      invalidate();
      setConfirm(false);
      showToast('Playlist excluída');
      router.dismissAll();
      router.navigate('/library');
    },
  });

  const submit = () => {
    const e = nameError(value);
    setError(e);
    if (e) {
      AccessibilityInfo.announceForAccessibility(e);
      return;
    }
    save.mutate();
  };

  return (
    <AuthLayout margin={0}>
      <View style={styles.form} testID="screen-playlist-edit">
        <PageHeader title={editing ? 'Editar playlist' : 'Nova playlist'} />
        <View style={styles.margin}>
          <TextField
            testID="playlist-name-input"
            label="Nome da playlist"
            value={value}
            onChangeText={(v) => {
              setName(v);
              if (error) setError(undefined);
            }}
            error={error}
            disabled={save.isPending}
            returnKeyType="done"
            onSubmitEditing={submit}
            autoFocus={!editing}
          />
          <Text variant="caption" tone="tertiary">
            Dê um nome para encontrá-la depois.
          </Text>
        </View>
      </View>
      <View style={[styles.margin, styles.actions]}>
        <Button label="Salvar" onPress={submit} loading={save.isPending} testID="playlist-save" />
        {editing ? (
          <Button
            variant="destructive"
            label="Excluir playlist"
            onPress={() => setConfirm(true)}
            testID="playlist-edit-delete"
          />
        ) : null}
      </View>
      <ConfirmDialog
        visible={confirm}
        title="Excluir playlist?"
        message={`“${value}” será removida da sua biblioteca. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        busy={del.isPending}
        onConfirm={() => del.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  margin: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  actions: { marginTop: 'auto', gap: spacing.md },
});
