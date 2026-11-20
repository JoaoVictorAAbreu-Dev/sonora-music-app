import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { usePlayer, playerStore } from '@/features/player';
import { layout, radius, spacing } from '@/theme';
import { GlassSurface } from '../GlassSurface';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { Artwork } from '../catalog/Artwork';

/** T11 mini player: glass, 64 pt, above the tab bar. Tap opens the full player. */
export function MiniPlayer() {
  const track = usePlayer((s) => s.queue[s.index] ?? null);
  const status = usePlayer((s) => s.status);
  if (!track) return null;
  const playing = status === 'playing' || status === 'buffering';
  return (
    <GlassSurface testID="mini-player" style={styles.bar}>
      <View style={styles.row}>
        <Pressable
          testID="mini-player-open"
          accessibilityRole="button"
          accessibilityLabel={`${track.title}, ${track.artist.name}. Abrir player`}
          onPress={() => router.push('/player')}
          style={styles.open}
        >
          <Artwork uri={track.artworkUrl} size={layout.miniArtworkSize} radius={radius.sm} />
          <View style={styles.texts}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {track.title}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {track.artist.name}
            </Text>
          </View>
          {playing ? <Icon name="equalizer" tint="live" /> : null}
        </Pressable>
        <IconButton
          testID="mini-player-toggle"
          icon={playing ? 'pause' : 'play'}
          filled
          label={playing ? 'Pausar' : 'Tocar'}
          onPress={() => void playerStore.getState().togglePlay()}
        />
        <IconButton
          testID="mini-player-next"
          icon="next"
          filled
          label="Próxima"
          onPress={() => void playerStore.getState().next()}
        />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: layout.miniPlayerHeight, marginBottom: spacing.sm },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.sm + spacing.xs / 2,
    paddingRight: spacing.md + spacing.xs / 2,
  },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1 },
});
