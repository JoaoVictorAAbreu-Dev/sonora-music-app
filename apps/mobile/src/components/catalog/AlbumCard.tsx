import { Pressable, StyleSheet } from 'react-native';
import { layout, opacity, radius, spacing } from '@/theme';
import { Text } from '../Text';
import { Artwork } from './Artwork';

/** "Card de álbum": 160 pt cover, title (body-strong) and subtitle (caption). */
export function AlbumCard({
  title,
  subtitle,
  artworkUrl,
  onPress,
  testID,
}: {
  title: string;
  subtitle: string;
  artworkUrl: string | null;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}, ${subtitle}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Artwork uri={artworkUrl} size={layout.albumCardWidth} radius={radius.md} />
      <Text variant="bodyStrong" numberOfLines={2}>
        {title}
      </Text>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: layout.albumCardWidth, gap: spacing.sm },
  pressed: { opacity: opacity.skeletonStatic },
});
