import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Text } from '@/components/Text';
import { Artwork } from '@/components/catalog/Artwork';
import { LoadingList } from '@/components/catalog/Skeleton';
import { authStore, useAuth } from '@/lib/auth/store';
import { color, layout, radius, spacing } from '@/theme';
import { useFavoriteIds, usePlaylists } from './api';

/** T07 Biblioteca: Favoritos, Recentes and "Suas playlists". */
export function LibraryScreen() {
  const favorites = useFavoriteIds();
  const playlists = usePlaylists();
  const email = useAuth((s) => s.user?.email);
  const favCount = favorites.data?.size;

  return (
    <Screen testID="screen-library" padded={false}>
      <View style={styles.header}>
        <Text variant="display" accessibilityRole="header">
          Biblioteca
        </Text>
        <IconButton
          icon="plus"
          label="Criar playlist"
          onPress={() => router.push('/playlist-edit')}
          testID="library-create"
        />
      </View>

      <View>
        <HubRow
          label="Favoritos"
          detail={
            favCount === undefined
              ? undefined
              : `${favCount} ${favCount === 1 ? 'faixa' : 'faixas'}`
          }
          onPress={() => router.push('/library/favorites')}
          testID="library-favorites"
        />
        <HubRow
          label="Recentes"
          onPress={() => router.push('/library/history')}
          testID="library-history"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Suas playlists" />
        {playlists.isPending ? <LoadingList rows={3} /> : null}
        {playlists.data?.playlists.length === 0 ? (
          <Text tone="secondary" style={styles.margin}>
            Crie uma playlist para juntar suas músicas favoritas.
          </Text>
        ) : null}
        <View>
          {playlists.data?.playlists.map((p) => (
            <Pressable
              key={p.id}
              testID={`playlist-${p.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.trackCount} faixas`}
              onPress={() => router.push(`/playlist/${p.id}`)}
              style={({ pressed }) => [styles.playlistRow, pressed && styles.pressed]}
            >
              <Artwork uri={p.artworkUrl} size={layout.rowArtworkSize} radius={radius.sm} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text variant="caption" tone="secondary">
                  {`${p.trackCount} ${p.trackCount === 1 ? 'faixa' : 'faixas'}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.margin}>
          <Button
            variant="secondary"
            label="+ Nova playlist"
            onPress={() => router.push('/playlist-edit')}
            testID="library-new-playlist"
          />
        </View>
      </View>

      <View style={[styles.margin, styles.account]}>
        {email ? (
          <Text variant="caption" tone="tertiary" testID="signed-in-as">
            {`Conectado como ${email}`}
          </Text>
        ) : null}
        <Button
          variant="text"
          label="Sair da conta"
          onPress={() => void authStore.getState().signOut()}
          testID="sign-out"
        />
      </View>
    </Screen>
  );
}

function HubRow({
  label,
  detail,
  onPress,
  testID,
}: {
  label: string;
  detail?: string;
  onPress(): void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.hubRow, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        {detail ? (
          <Text variant="caption" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </View>
      <Text variant="title" tone="secondary" importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenMargin,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.fieldHeight,
    paddingHorizontal: layout.screenMargin,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.hairline,
  },
  section: { gap: spacing.md },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.listRowHeight,
    paddingHorizontal: layout.screenMargin,
  },
  pressed: { backgroundColor: color.bg.raised },
  flex: { flex: 1 },
  margin: { paddingHorizontal: layout.screenMargin },
  account: { gap: spacing.xs, alignItems: 'flex-start' },
});
