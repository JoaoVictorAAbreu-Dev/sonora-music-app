import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { SearchResponse, SearchType, Track } from '@sonora/shared';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { AlbumCard } from '@/components/catalog/AlbumCard';
import { ArtistAvatar } from '@/components/catalog/ArtistAvatar';
import { Carousel } from '@/components/catalog/Carousel';
import { FilterChip } from '@/components/catalog/FilterChip';
import { GenreTile, type Genre } from '@/components/catalog/GenreTile';
import { LoadingList } from '@/components/catalog/Skeleton';
import { TrackRow } from '@/components/catalog/TrackRow';
import { duration, layout, spacing } from '@/theme';
import { bezier } from '@/lib/motion';
import { useSearch } from './api';
import { errorCopy } from './copy';
import { useRecentSearches } from './recent-searches';

/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;
/** Tracks shown in the "Tudo" view before "Ver tudo". */
const ALL_TRACKS_PREVIEW = 4;

const filters: { type: SearchType; label: string }[] = [
  { type: 'all', label: 'Tudo' },
  { type: 'tracks', label: 'Músicas' },
  { type: 'artists', label: 'Artistas' },
  { type: 'albums', label: 'Álbuns' },
];

/** Genre tiles and the Jamendo search term each one runs. */
const genres: { genre: Genre; label: string; query: string }[] = [
  { genre: 'pop', label: 'Pop', query: 'pop' },
  { genre: 'rock', label: 'Rock', query: 'rock' },
  { genre: 'hiphop', label: 'Hip-hop', query: 'hiphop' },
  { genre: 'electronic', label: 'Eletrônica', query: 'electronic' },
  { genre: 'mpb', label: 'MPB', query: 'mpb' },
  { genre: 'jazz', label: 'Jazz', query: 'jazz' },
];

export type SearchMode = 'initial' | 'typing' | 'loading' | 'error' | 'empty' | 'results';

export function isEmptyResult(r: SearchResponse): boolean {
  return r.tracks.length + r.albums.length + r.artists.length === 0;
}

/** T06 Buscar: initial, typing, loading (skeleton), results, empty and error. */
export function SearchScreen({
  onPlay,
  onMore,
}: {
  onPlay?: (track: Track, list: Track[]) => void;
  onMore?: (track: Track) => void;
}) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchType>('all');
  const recent = useRecentSearches();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const trimmed = text.trim();
  // An empty field means no search, whatever the last debounced query was.
  const activeQuery = trimmed ? query : '';
  const search = useSearch(activeQuery, filter);
  useEffect(() => {
    if (!trimmed) return;
    timer.current = setTimeout(() => setQuery(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [trimmed]);

  const { add } = recent;
  useEffect(() => {
    if (search.isSuccess && activeQuery && !isEmptyResult(search.data)) add(activeQuery);
  }, [search.isSuccess, search.data, activeQuery, add]);

  const runNow = (q: string) => {
    setText(q);
    setQuery(q.trim());
  };

  const mode: SearchMode = !trimmed
    ? 'initial'
    : trimmed !== query
      ? 'typing'
      : search.isPending
        ? 'loading'
        : search.isError
          ? 'error'
          : search.data && isEmptyResult(search.data)
            ? 'empty'
            : 'results';

  const showFilters = mode === 'loading' || mode === 'results' || mode === 'empty';
  const matches = recent.items.filter(
    (i) =>
      i.toLowerCase().startsWith(trimmed.toLowerCase()) &&
      i.toLowerCase() !== trimmed.toLowerCase(),
  );

  return (
    <Screen testID="screen-search" padded={false}>
      <Text variant="display" accessibilityRole="header" style={styles.margin}>
        Buscar
      </Text>
      <View style={styles.margin}>
        <TextField
          testID="search-input"
          label="Artistas, faixas, álbuns"
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => trimmed && setQuery(trimmed)}
        />
      </View>

      {showFilters ? (
        <View style={styles.filters} accessibilityRole="tablist">
          {filters.map((f) => (
            <FilterChip
              key={f.type}
              testID={`filter-${f.type}`}
              label={f.label}
              selected={filter === f.type}
              onPress={() => setFilter(f.type)}
            />
          ))}
        </View>
      ) : null}

      <Animated.View
        key={mode}
        entering={FadeIn.duration(duration.standard).easing(bezier('entrance'))}
        style={styles.body}
        testID={`search-${mode}`}
      >
        {mode === 'initial' ? (
          <>
            {recent.items.length > 0 ? (
              <View>
                <SectionHeader
                  title="Buscas recentes"
                  variant="bodyStrong"
                  action={{ label: 'Limpar', onPress: recent.clear, testID: 'recent-clear' }}
                />
                {recent.items.map((item) => (
                  <View key={item} style={styles.recentRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Buscar ${item}`}
                      onPress={() => runNow(item)}
                      style={styles.recentMain}
                    >
                      <Icon name="search" size={layout.brandIconSize} tint="muted" />
                      <Text numberOfLines={1} style={styles.flex}>
                        {item}
                      </Text>
                    </Pressable>
                    <IconButton
                      icon="close"
                      label={`Remover ${item} das buscas recentes`}
                      onPress={() => recent.remove(item)}
                    />
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.section}>
              <SectionHeader title="Explorar por gênero" variant="bodyStrong" />
              <View style={styles.genres}>
                {genres.map((g) => (
                  <GenreTile
                    key={g.genre}
                    genre={g.genre}
                    label={g.label}
                    onPress={() => runNow(g.query)}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {mode === 'typing' ? (
          <View>
            {[trimmed, ...matches].map((s, i) => (
              <Pressable
                key={`${i}-${s}`}
                testID={i === 0 ? 'suggestion-current' : undefined}
                accessibilityRole="button"
                accessibilityLabel={`Buscar ${s}`}
                onPress={() => runNow(s)}
                style={styles.suggestion}
              >
                <Icon name="search" size={layout.brandIconSize} tint="muted" />
                <Text numberOfLines={1} style={styles.flex}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {mode === 'loading' ? <LoadingList label="Buscando" /> : null}

        {mode === 'error' ? (
          <EmptyState
            testID="search-error-state"
            icon="queue"
            title="Não foi possível buscar"
            description={errorCopy(search.error).description}
            action={{ label: 'Tentar de novo', onPress: () => void search.refetch() }}
          />
        ) : null}

        {mode === 'empty' ? (
          <EmptyState
            icon="search"
            title={`Nenhum resultado para “${query}”`}
            description="Verifique a ortografia ou tente outro termo."
            action={{ label: 'Limpar busca', variant: 'secondary', onPress: () => runNow('') }}
          />
        ) : null}

        {mode === 'results' && search.data ? (
          <Results
            data={search.data}
            filter={filter}
            onFilter={setFilter}
            onPlay={onPlay}
            onMore={onMore}
          />
        ) : null}
      </Animated.View>
    </Screen>
  );
}

function Results({
  data,
  filter,
  onFilter,
  onPlay,
  onMore,
}: {
  data: SearchResponse;
  filter: SearchType;
  onFilter: (f: SearchType) => void;
  onPlay?: (track: Track, list: Track[]) => void;
  onMore?: (track: Track) => void;
}) {
  const rows = (tracks: Track[]) =>
    tracks.map((t) => (
      <TrackRow
        key={t.id}
        track={t}
        testID={`result-track-${t.id}`}
        onPress={onPlay ? () => onPlay(t, data.tracks) : undefined}
        onMore={onMore ? () => onMore(t) : undefined}
      />
    ));

  if (filter === 'tracks') return <View>{rows(data.tracks)}</View>;
  if (filter === 'artists') {
    return (
      <View style={styles.grid}>
        {data.artists.map((a) => (
          <ArtistAvatar key={a.id} artist={a} />
        ))}
      </View>
    );
  }
  if (filter === 'albums') {
    return (
      <View style={styles.grid}>
        {data.albums.map((a) => (
          <AlbumCard
            key={a.id}
            title={a.title}
            subtitle={a.artist.name}
            artworkUrl={a.artworkUrl}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.section}>
      {data.tracks.length > 0 ? (
        <View>
          <SectionHeader
            title="Músicas"
            variant="bodyStrong"
            action={
              data.tracks.length > ALL_TRACKS_PREVIEW
                ? { label: 'Ver tudo', onPress: () => onFilter('tracks'), testID: 'see-all-tracks' }
                : undefined
            }
          />
          {rows(data.tracks.slice(0, ALL_TRACKS_PREVIEW))}
        </View>
      ) : null}
      {data.artists.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Artistas" variant="bodyStrong" />
          <Carousel>
            {data.artists.map((a) => (
              <ArtistAvatar key={a.id} artist={a} />
            ))}
          </Carousel>
        </View>
      ) : null}
      {data.albums.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Álbuns" variant="bodyStrong" />
          <Carousel>
            {data.albums.map((a) => (
              <AlbumCard
                key={a.id}
                title={a.title}
                subtitle={a.artist.name}
                artworkUrl={a.artworkUrl}
              />
            ))}
          </Carousel>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  margin: { paddingHorizontal: layout.screenMargin },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: layout.screenMargin,
  },
  body: { gap: spacing.xl },
  section: { gap: spacing.lg },
  flex: { flex: 1 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: layout.screenMargin,
    minHeight: layout.minTouchTarget + spacing.xs,
  },
  recentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: layout.screenMargin,
    paddingVertical: spacing.md,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenMargin,
    paddingVertical: spacing.md,
    minHeight: layout.minTouchTarget + spacing.xs,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: layout.screenMargin,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingHorizontal: layout.screenMargin,
  },
});
