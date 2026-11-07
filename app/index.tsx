import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { colors } from '@/theme';

// Home tab, the screen the app opens on. Stage 2 of the UI redesign puts the
// Sennin image here; for now it only shows the name.
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenPlaceholder title="Sennin" lines={[]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
  },
});
