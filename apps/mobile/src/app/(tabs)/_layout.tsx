import { Tabs } from 'expo-router/js-tabs';
import { TabBar, tabItems } from '@/components/TabBar';
import { color } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg.base } }}
    >
      {tabItems.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}
