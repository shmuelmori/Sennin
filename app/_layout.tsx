import { Tabs, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ColorValue } from 'react-native';

import { TabIcon, type TabIconName } from '@/components/TabIcon';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import { FeedListSignalProvider } from '@/hooks/FeedListSignal';
import { colors, fontSize } from '@/theme';
import { navigationTheme } from '@/theme/navigationTheme';

type TabIconProps = { focused: boolean; color: ColorValue; size: number };

function tabIcon(name: TabIconName, activeName: TabIconName) {
  return function Icon(props: TabIconProps) {
    return <TabIcon name={name} activeName={activeName} {...props} />;
  };
}

// Expo Router requires a default export for route and layout files.
// Five tabs with a bottom bar on every screen (spec §4). The bar shows them
// in the order below; the app opens on Home ("/", app/index.tsx). No screen
// has a header, so the Feed gets the full height above the bar.
export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <DatabaseProvider>
        <FeedListSignalProvider>
          <Tabs
            backBehavior="history"
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              tabBarActiveTintColor: colors.sunset,
              tabBarInactiveTintColor: colors.silver,
              tabBarStyle: {
                backgroundColor: colors.deepSeaNight,
                borderTopColor: colors.tealMist,
              },
              tabBarLabelStyle: { fontSize: fontSize.tabLabel },
            }}
          >
            <Tabs.Screen
              name="feed"
              options={{ title: 'Feed', tabBarIcon: tabIcon('play-circle-outline', 'play-circle') }}
            />
            <Tabs.Screen
              name="status"
              options={{
                title: 'Status',
                tabBarIcon: tabIcon('stats-chart-outline', 'stats-chart'),
              }}
            />
            <Tabs.Screen
              name="sources"
              options={{ title: 'Sources', tabBarIcon: tabIcon('albums-outline', 'albums') }}
            />
            <Tabs.Screen
              name="refresh"
              options={{
                title: 'Refresh',
                tabBarIcon: tabIcon('refresh-circle-outline', 'refresh-circle'),
              }}
            />
            <Tabs.Screen
              name="index"
              options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }}
            />
          </Tabs>
        </FeedListSignalProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
