import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { elevation, layout, spacing } from '@/theme';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface TabItem {
  name: string;
  label: string;
  icon: IconName;
}

/** The three primary tabs, in Figma order ("Barra de abas (vidro)"). */
export const tabItems: TabItem[] = [
  { name: 'index', label: 'Início', icon: 'home' },
  { name: 'search', label: 'Buscar', icon: 'search' },
  { name: 'library', label: 'Biblioteca', icon: 'library' },
];

/** Floating glass tab bar: 64 pt high, screen margin on both sides, above the home indicator. */
export function TabBar({ state, navigateToTab, emitter, insets }: BottomTabBarProps) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: Math.max(insets.bottom, spacing.lg) }]}
    >
      <GlassSurface testID="tab-bar" style={styles.bar}>
        <View accessibilityRole="tablist" style={styles.row}>
          {state.routes.map((route, i) => {
            const item = tabItems.find((t) => t.name === route.name);
            if (!item) return null;
            const selected = state.index === i;
            const onPress = () => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!selected && !event.defaultPrevented) navigateToTab(route.key);
            };
            return (
              <Pressable
                key={route.key}
                testID={`tab-${item.name}`}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected }}
                onPress={onPress}
                style={styles.tab}
              >
                <Icon name={item.icon} filled={selected} tint={selected ? 'default' : 'muted'} />
                <Text variant="label" tone={selected ? 'primary' : 'secondary'} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: layout.screenMargin,
    right: layout.screenMargin,
    shadowColor: elevation.glass.shadow.shadowColor,
    shadowOpacity: elevation.glass.shadow.opacity,
    shadowRadius: elevation.glass.shadow.blur / 2,
    shadowOffset: { width: 0, height: elevation.glass.shadow.offsetY },
  },
  bar: { minHeight: layout.tabBarHeight },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  tab: {
    flex: 1,
    minHeight: layout.minTouchTarget + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.iconLabelGap,
  },
});
