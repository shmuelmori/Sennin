import { DarkTheme } from 'expo-router';

import { colors } from './index';

// Colors the header, screen backgrounds and transitions with the §11 palette,
// so no screen flashes white between navigations.
export const navigationTheme: typeof DarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.sunset,
    background: colors.deepSeaNight,
    card: colors.deepSeaNight,
    text: colors.silver,
    border: colors.tealMist,
    notification: colors.sunset,
  },
};
