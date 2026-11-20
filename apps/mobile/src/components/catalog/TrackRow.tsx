import { Pressable, StyleSheet, View } from 'react-native';
import type { Track } from '@sonora/shared';
import { color, layout, opacity, radius, spacing } from '@/theme';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { Artwork } from './Artwork';

export type TrackRowState = 'default' | 'playing' | 'unavailable';

/** "Linha de faixa": 64 pt row with cover, title, artist and "Mais opções". */
export function TrackRow({
  track,
  state = 'default',
  onPress,
  onMore,
  testID,
}: {
  track: Track;
  state?: TrackRowState;
  onPress?: () => void;
  onMore?: () => void;
  testID?: string;
}) {
  const playing = state === 'playing';
  const unavailable = state === 'unavailable';
  const subtitle = unavailable ? `${track.artist.name} · Indisponível` : track.artist.name;
  const a11yLabel = `${track.title}, ${track.artist.name}${playing ? ', tocando agora' : ''}${
    unavailable ? ', indisponível' : ''
  }`;
  return (
    <View style={[styles.row, unavailable && styles.unavailable]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled: unavailable || !onPress, selected: playing }}
        disabled={unavailable || !onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <Artwork uri={track.artworkUrl} size={layout.rowArtworkSize} radius={radius.sm} />
        <View style={styles.texts}>
          <Text
            variant="bodyStrong"
            numberOfLines={1}
            style={playing ? { color: color.text.highlight } : undefined}
          >
            {track.title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {playing ? <Icon name="equalizer" tint="live" /> : null}
      </Pressable>
      {onMore ? (
        <IconButton icon="more" label={`Mais opções para ${track.title}`} onPress={onMore} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: spacing.lg,
    minHeight: layout.listRowHeight,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: color.bg.raised },
  texts: { flex: 1 },
  unavailable: { opacity: opacity.unavailable },
});
