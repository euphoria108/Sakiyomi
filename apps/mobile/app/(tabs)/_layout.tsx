import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#4F86C6' }}>
      <Tabs.Screen name="articles/index" options={{ title: '記事', tabBarLabel: '記事' }} />
      <Tabs.Screen name="feeds/index" options={{ title: 'フィード', tabBarLabel: 'フィード' }} />
    </Tabs>
  );
}
