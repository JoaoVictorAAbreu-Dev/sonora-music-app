import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Track } from '@sonora/shared';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Text } from '@/components/Text';
import { AlbumCard } from '@/components/catalog/AlbumCard';
import { Artwork } from '@/components/catalog/Artwork';
import { Carousel } from '@/components/catalog/Carousel';
import { LoadingList } from '@/components/catalog/Skeleton';
import { TrackRow } from '@/components/catalog/TrackRow';
import { openTrackOptions } from '@/features/library/track-actions';
import { playerStore, usePlayer } from '@/features/player';
import { showToast } from '@/features/ui/toast';
import { color, layout, radius, spacing } from '@/theme';
import { useAlbum, useArtist } from './api';
import { errorCopy } from './copy';
import { albumLicenseNote } from './license';

const faixas = (n: number) => `${n} ${n === 1 ? 'faixa' : 'faixas'}`;

export const openAlbum = (id: string) => router.push(`/album/${id}`);
export const openArtist = (id: string) => router.push(`/artist/${id}`);

/** T08 Artista: round photo, name, "Tocar", "Faixas populares" and "Álbuns". */
export function ArtistScreen({ id }: { id: string }) {
  const artist = useArtist(id);
  const a = artist.data;
  return (
    <CollectionLayout
      testID="screen-artist"
      query={artist}
      title={a?.name ?? ''}
      sheetSubtitle="Artista"
      tracks={a?.topTracks ?? []}
      hero={
        a ? (
          <Hero
            artwork={
              <Artwork
                uri={a.imageUrl}
                size={layout.playlistCoverSize}
                radius={layout.playlistCoverSize / 2}
              />
            }
            title={a.name}
            details={<Text tone="secondary">Artista</Text>}
          />
        ) : null
      }
    >
      {a ? (
        <>
          {a.topTracks.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Faixas populares" />
              <Tracks tracks={a.topTracks} testPrefix="artist-track" />
            </View>
          ) : null}
          {a.albums.length > 0 ? (
            <View style={styles.section} testID="artist-albums">
              <SectionHeader title="Álbuns" />
              <Carousel>
                {a.albums.map((al) => (
                  <AlbumCard
                    key={al.id}
                    testID={`artist-album-${al.id}`}
                    title={al.title}
                    subtitle={al.releaseDate?.slice(0, 4) ?? 'Álbum'}
                    artworkUrl={al.artworkUrl}
                    onPress={() => openAlbum(al.id)}
                  />
                ))}
              </Carousel>
            </View>
          ) : null}
          {a.topTracks.length + a.albums.length === 0 ? (
            <EmptyState
              icon="search"
              title="Nada deste artista ainda"
              description="Não encontramos músicas disponíveis deste artista."
            />
          ) : null}
        </>
      ) : null}
    </CollectionLayout>
  );
}

/** T09 Álbum: cover, title, "Artista · ano · N faixas", "Tocar", tracks and the license note. */
export function AlbumScreen({ id }: { id: string }) {
  const album = useAlbum(id);
  const al = album.data;
  const note = al ? albumLicenseNote(al.tracks) : null;
  const year = al?.releaseDate?.slice(0, 4);
  return (
    <CollectionLayout
      testID="screen-album"
      query={album}
      title={al?.title ?? ''}
      sheetSubtitle={al ? `Álbum · ${al.artist.name}` : 'Álbum'}
      tracks={al?.tracks ?? []}
      artistId={al?.artist.id}
      hero={
        al ? (
          <Hero
            artwork={
              <Artwork uri={al.artworkUrl} size={layout.playlistCoverSize} radius={radius.lg} />
            }
            title={al.title}
            details={
              <Text
                tone="secondary"
                accessibilityRole="link"
                accessibilityHint="Abre o artista"
                onPress={() => openArtist(al.artist.id)}
                testID="album-artist"
              >
                {[al.artist.name, year, faixas(al.tracks.length)].filter(Boolean).join(' · ')}
              </Text>
            }
          />
        ) : null
      }
    >
      {al ? (
        <>
          {al.tracks.length > 0 ? (
            <Tracks tracks={al.tracks} testPrefix="album-track" />
          ) : (
            <EmptyState
              icon="search"
              title="Álbum sem faixas"
              description="Nenhuma faixa deste álbum está disponível agora."
            />
          )}
          {note ? (
            <Text
              variant="caption"
              tone="secondary"
              style={styles.margin}
              accessibilityRole="link"
              onPress={() => router.push('/about')}
              testID="album-license"
            >
              {note}
            </Text>
          ) : null}
        </>
      ) : null}
    </CollectionLayout>
  );
}

/** Shared frame: header with back + "Mais opções", loading/error states, hero, "Tocar" and content. */
function CollectionLayout({
  testID,
  query,
  title,
  sheetSubtitle,
  tracks,
  artistId,
  hero,
  children,
}: {
  testID: string;
  query: { isPending: boolean; isError: boolean; error: unknown; refetch(): unknown };
  title: string;
  sheetSubtitle: string;
  tracks: Track[];
  artistId?: string;
  hero: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]} testID={testID}>
      <PageHeader
        title=""
        trailing={
          hero ? (
            <IconButton
              icon="more"
              label={`Mais opções para ${title}`}
              onPress={() => setMenu(true)}
              testID="collection-menu"
            />
          ) : null
        }
      />
      {query.isPending ? <LoadingList /> : null}
      {query.isError ? (
        <EmptyState
          icon="queue"
          title={errorCopy(query.error).title}
          description={errorCopy(query.error).description}
          action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
        />
      ) : null}
      {hero ? (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + spacing['2xl'],
            gap: spacing.lg,
          }}
        >
          {hero}
          <View style={styles.margin}>
            <Button
              label="Tocar"
              disabled={tracks.length === 0}
              onPress={() => void playerStore.getState().playList(tracks, 0)}
              testID="collection-play"
            />
          </View>
          {children}
        </ScrollView>
      ) : null}

      <BottomSheet
        visible={menu}
        title={title}
        subtitle={sheetSubtitle}
        onClose={() => setMenu(false)}
        testID="collection-sheet"
      >
        <SheetAction
          testID="collection-queue"
          icon={<Icon name="queue" />}
          label="Adicionar à fila"
          onPress={() => {
            tracks.forEach((t) => playerStore.getState().addToQueue(t));
            setMenu(false);
            showToast(tracks.length === 1 ? 'Adicionada à fila' : 'Adicionadas à fila');
          }}
        />
        {artistId ? (
          <SheetAction
            testID="collection-artist"
            icon={<Icon name="library" />}
            label="Ver artista"
            onPress={() => {
              setMenu(false);
              openArtist(artistId);
            }}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}

function Hero({
  artwork,
  title,
  details,
}: {
  artwork: ReactNode;
  title: string;
  details: ReactNode;
}) {
  return (
    <View style={styles.hero}>
      {artwork}
      <Text variant="display" accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      {details}
    </View>
  );
}

function Tracks({ tracks, testPrefix }: { tracks: Track[]; testPrefix: string }) {
  const currentId = usePlayer((s) => s.queue[s.index]?.id ?? null);
  const active = usePlayer((s) => s.status === 'playing' || s.status === 'buffering');
  return (
    <View>
      {tracks.map((t, i) => (
        <TrackRow
          key={t.id}
          track={t}
          testID={`${testPrefix}-${t.id}`}
          state={active && t.id === currentId ? 'playing' : 'default'}
          onPress={() => void playerStore.getState().playList(tracks, i)}
          onMore={() => openTrackOptions(t)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: layout.screenMargin },
  center: { textAlign: 'center' },
  margin: { paddingHorizontal: layout.screenMargin },
  section: { gap: spacing.lg },
});
