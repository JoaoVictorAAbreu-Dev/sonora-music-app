import { Pressable, StyleSheet } from 'react-native';
import type { Artist } from '@sonora/shared';
import { layout, opacity, spacing } from '@/theme';
import { Text } from '../Text';
import { Artwork } from './Artwork';

/** Round artist photo with name (T06 Resultados › Artistas). */
export function ArtistAvatar({
  artist,
  onPress,
  testID,
}: {
  artist: Artist;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${artist.name}, artista`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <Artwork
        uri={artist.imageUrl}
        size={layout.artistAvatarSize}
        radius={layout.artistAvatarSize / 2}
      />
      <Text variant="caption" numberOfLines={2} style={styles.name}>
        {artist.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: layout.artistAvatarSize, gap: spacing.sm, alignItems: 'center' },
  name: { textAlign: 'center' },
  pressed: { opacity: opacity.skeletonStatic },
});
