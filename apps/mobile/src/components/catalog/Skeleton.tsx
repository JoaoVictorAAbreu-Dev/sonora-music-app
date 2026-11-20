import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { color, duration, layout, opacity, radius, spacing } from '@/theme';
import { bezier } from '@/lib/motion';
import { useMotionReduced } from '@/features/settings/store';

/**
 * Pulsing placeholder (Figma "Esqueleto"): opacity 100% ↔ 50%, 600 ms each way.
 * With Reduce Motion it stays static at 70%.
 */
export function SkeletonPulse({ children }: { children: React.ReactNode }) {
  const reduce = useMotionReduced();
  const o = useSharedValue(reduce ? opacity.skeletonStatic : 1);
  useEffect(() => {
    if (reduce) return;
    o.set(
      withRepeat(
        withTiming(opacity.skeletonLow, {
          duration: duration.skeleton / 2,
          easing: bezier('standard'),
        }),
        -1,
        true,
      ),
    );
  }, [reduce, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function SkeletonBlock({
  width,
  height,
  r = radius.sm,
}: {
  width: DimensionValue;
  height: number;
  r?: number;
}) {
  return <View style={{ width, height, borderRadius: r, backgroundColor: color.bg.overlay }} />;
}

/** "Linha de faixa / Carregando". */
export function SkeletonTrackRow() {
  return (
    <View style={styles.row}>
      <SkeletonBlock width={layout.rowArtworkSize} height={layout.rowArtworkSize} />
      <View style={styles.texts}>
        <SkeletonBlock width="60%" height={layout.skeletonTitleHeight} />
        <SkeletonBlock width="35%" height={layout.skeletonCaptionHeight} r={radius.sm / 2 + 2} />
      </View>
    </View>
  );
}

/** "Esqueleto — Card de álbum". */
export function SkeletonAlbumCard() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width={layout.albumCardWidth} height={layout.albumCardWidth} r={radius.md} />
      <SkeletonBlock width="80%" height={layout.skeletonTitleHeight} />
      <SkeletonBlock width="50%" height={layout.skeletonCaptionHeight} r={radius.sm / 2 + 2} />
    </View>
  );
}

/** Accessible wrapper so screen readers announce loading once instead of each block. */
export function LoadingList({ rows = 6, label = 'Carregando' }: { rows?: number; label?: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      testID="loading"
    >
      <SkeletonPulse>
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonTrackRow key={i} />
        ))}
      </SkeletonPulse>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: layout.listRowHeight,
  },
  texts: { flex: 1, gap: spacing.sm },
  card: { width: layout.albumCardWidth, gap: spacing.sm },
});
