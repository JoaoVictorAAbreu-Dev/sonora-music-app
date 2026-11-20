import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { color } from '@/theme';

/** Cover/photo with the Figma placeholder (bg.overlay) while loading or when missing. */
export function Artwork({
  uri,
  size,
  radius,
}: {
  uri: string | null;
  size: number;
  radius: number;
}) {
  const box = { width: size, height: size, borderRadius: radius };
  return (
    <View style={[styles.placeholder, box]} accessible={false}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          contentFit="cover"
          transition={0}
          accessible={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: color.bg.overlay, overflow: 'hidden' },
});
