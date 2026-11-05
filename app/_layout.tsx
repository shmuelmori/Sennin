import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '@/db/DatabaseProvider';
import { colors } from '@/theme';
import { navigationTheme } from '@/theme/navigationTheme';

// Expo Router requires a default export for route and layout files.
// Feed is the home screen; Sources and Status open from its header (spec §4).
export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <DatabaseProvider>
        <Stack
          screenOptions={{
            animation: 'fade',
            headerTintColor: colors.silver,
            headerShadowVisible: false,
          }}
        />
      </DatabaseProvider>
    </ThemeProvider>
  );
}
