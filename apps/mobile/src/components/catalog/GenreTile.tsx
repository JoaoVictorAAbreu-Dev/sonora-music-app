import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { genreGradient, layout, opacity, radius, spacing } from '@/theme';
import { Text } from '../Text';

export type Genre = keyof typeof genreGradient;

/** "Explorar por gênero" tile (T06 initial state). */
export function GenreTile({
  genre,
  label,
  onPress,
}: {
  genre: Genre;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`genre-${genre}`}
      accessibilityRole="button"
      accessibilityLabel={`Explorar ${label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={genreGradient[genre]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: layout.genreTileHeight,
    padding: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  pressed: { opacity: opacity.skeletonStatic },
});
