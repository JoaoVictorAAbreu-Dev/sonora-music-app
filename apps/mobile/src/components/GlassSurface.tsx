import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { color, elevation, radius, withAlpha } from '@/theme';
import { useReduceTransparency } from '@/hooks/useReduceTransparency';

/** True when native Liquid Glass can render (iOS 26+ with the API present). */
export function canUseGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

export interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Controls-layer surface (tab bar, mini player). Liquid Glass when available and
 * Reduce Transparency is off; otherwise the solid fallback (bg.base, hairline border).
 * Content must never use this component.
 */
export function GlassSurface({ children, style, testID }: GlassSurfaceProps) {
  const reduceTransparency = useReduceTransparency();
  const glass = canUseGlass() && !reduceTransparency;

  if (glass) {
    return (
      <GlassView
        testID={testID}
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={withAlpha(color.bg.base, elevation.glass.tintOpacity)}
        style={[styles.base, style]}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View testID={testID} style={[styles.base, styles.solid, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    overflow: 'hidden',
  },
  solid: { backgroundColor: color.bg.base },
});
