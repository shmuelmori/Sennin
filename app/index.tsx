import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInImage } from '@/components/FadeInImage';
import { colors } from '@/theme';

// 864x1200. Shown whole (`contain`), so it is never cropped or stretched;
// Deep Sea Night fills the space around it.
const SENNIN_ART = require('@/assets/images/sennin.jpeg');

// Expo Router requires a default export for route files.
// Home tab, the screen the app opens on (spec §4 "Home"): the Sennin image
// and nothing else but the tab bar.
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FadeInImage resizeMode="contain" source={SENNIN_ART} style={styles.art} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
  },
  art: {
    flex: 1,
    width: '100%',
  },
});
