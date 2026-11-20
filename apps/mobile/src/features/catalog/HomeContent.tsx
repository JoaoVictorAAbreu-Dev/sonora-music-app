import { RefreshControl, StyleSheet, View } from 'react-native';
import type { HomeResponse, Track } from '@sonora/shared';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Text } from '@/components/Text';
import { AlbumCard } from '@/components/catalog/AlbumCard';
import { Carousel } from '@/components/catalog/Carousel';
import { SkeletonAlbumCard, SkeletonPulse, SkeletonTrackRow } from '@/components/catalog/Skeleton';
import { TrackRow } from '@/components/catalog/TrackRow';
import { color, layout, spacing } from '@/theme';
import { errorCopy } from './copy';

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export interface HomeContentProps {
  data: HomeResponse | undefined;
  status: 'pending' | 'error' | 'success';
  error?: unknown;
  refreshing: boolean;
  onRefresh(): void;
  onPlay?(track: Track, list: Track[]): void;
}

/** T05 Início: greeting, "Continuar ouvindo", "Feito para você" and "Populares". */
export function HomeContent({
  data,
  status,
  error,
  refreshing,
  onRefresh,
  onPlay,
}: HomeContentProps) {
  return (
    <Screen
      testID="screen-home"
      padded={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={color.action.primary}
          colors={[color.action.primary]}
          progressBackgroundColor={color.bg.raised}
        />
      }
    >
      <Text variant="display" accessibilityRole="header" style={styles.margin}>
        {greeting()}
      </Text>

      {status === 'pending' ? <HomeSkeleton /> : null}

      {status === 'error' ? (
        <EmptyState
          testID="home-error"
          icon="queue"
          title={errorCopy(error).title}
          description={errorCopy(error).description}
          action={{ label: 'Tentar de novo', onPress: onRefresh }}
        />
      ) : null}

      {status === 'success' && data ? (
        <>
          {data.continueListening.length > 0 ? (
            <View style={styles.section} testID="section-continue">
              <SectionHeader title="Continuar ouvindo" />
              <Carousel>
                {data.continueListening.map((t) => (
                  <AlbumCard
                    key={t.id}
                    title={t.title}
                    subtitle={t.artist.name}
                    artworkUrl={t.artworkUrl}
                    onPress={onPlay ? () => onPlay(t, data.continueListening) : undefined}
                  />
                ))}
              </Carousel>
            </View>
          ) : null}

          {data.madeForYou.length > 0 ? (
            <View style={styles.section} testID="section-made-for-you">
              <SectionHeader title="Feito para você" />
              <Carousel>
                {data.madeForYou.map((a) => (
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

          {data.popular.length > 0 ? (
            <View style={styles.section} testID="section-popular">
              <SectionHeader title="Populares" />
              <View>
                {data.popular.map((t) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    testID={`track-${t.id}`}
                    onPress={onPlay ? () => onPlay(t, data.popular) : undefined}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {data.madeForYou.length + data.popular.length + data.continueListening.length === 0 ? (
            <EmptyState
              testID="home-empty"
              icon="search"
              title="Nada por aqui ainda"
              description="Busque uma música para começar a ouvir."
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function HomeSkeleton() {
  return (
    <View
      accessible
      accessibilityLabel="Carregando"
      accessibilityState={{ busy: true }}
      testID="loading"
    >
      <SkeletonPulse>
        <View style={styles.section}>
          <View style={styles.skeletonCards}>
            <SkeletonAlbumCard />
            <SkeletonAlbumCard />
            <SkeletonAlbumCard />
          </View>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonTrackRow key={i} />
          ))}
        </View>
      </SkeletonPulse>
    </View>
  );
}

const styles = StyleSheet.create({
  margin: { paddingHorizontal: layout.screenMargin },
  section: { gap: spacing.lg },
  skeletonCards: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout.screenMargin,
    overflow: 'hidden',
  },
});
