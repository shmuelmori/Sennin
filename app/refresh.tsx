import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { useRefresh } from '@/hooks/useRefresh';
import { colors, spacing } from '@/theme';

// Refresh tab (F4): builds a new list. For now this is the Feed's old button
// and alert, moved here; Stage 4 of the UI redesign gives it the large button
// and the fetch report. A new list reaches the Feed through FeedListSignal.
export default function RefreshScreen() {
  const { refreshing, refresh } = useRefresh();

  const onRefresh = async () => {
    const result = await refresh();
    if (result === null) return;
    Alert.alert(result.message.title, result.message.message);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenPlaceholder title="Refresh" lines={['Build a new list of 15 Shorts.']}>
        <View style={styles.button}>
          <PrimaryButton
            label={refreshing ? 'Refreshing…' : 'Refresh'}
            disabled={refreshing}
            onPress={() => void onRefresh()}
          />
        </View>
      </ScreenPlaceholder>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
  },
  button: {
    marginTop: spacing.md,
  },
});
