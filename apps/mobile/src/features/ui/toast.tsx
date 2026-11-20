import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { color, duration, layout, radius, spacing } from '@/theme';

interface ToastState {
  message: string | null;
  /** Bumps on every show so the same text can be shown twice. */
  id: number;
  show(message: string): void;
  hide(): void;
}

/** "Feedback (toast)": one message at a time, announced to screen readers. */
export const useToast = create<ToastState>()((set) => ({
  message: null,
  id: 0,
  show: (message) => {
    set((s) => ({ message, id: s.id + 1 }));
    AccessibilityInfo.announceForAccessibility(message);
  },
  hide: () => set({ message: null }),
}));

export const showToast = (message: string) => useToast.getState().show(message);

/** Rendered once in the root layout, above the tab bar. */
export function ToastHost() {
  const { message, id, hide } = useToast();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, layout.toastVisibleMs);
    return () => clearTimeout(t);
  }, [message, id, hide]);
  if (!message) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        { bottom: insets.bottom + layout.tabBarHeight + layout.miniPlayerHeight + spacing.xl },
      ]}
    >
      <Animated.View
        key={id}
        entering={FadeIn.duration(duration.standard)}
        exiting={FadeOut.duration(duration.standard)}
        style={styles.toast}
        testID="toast"
        accessibilityLiveRegion="polite"
      >
        <Icon name="heart" filled tint="live" size={layout.brandIconSize} />
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: layout.screenMargin, right: layout.screenMargin },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: color.bg.overlay,
  },
  text: { flex: 1 },
});
