import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Divider } from '@/components/Divider';
import { FetchReport } from '@/components/FetchReport';
import { StatusRows } from '@/components/StatusRows';
import { useStatus } from '@/hooks/useStatus';
import { colors, spacing } from '@/theme';

// Expo Router requires a default export for route files.
// Status screen (spec §4, F11): the last fetch's time, duration, videos
// fetched, rejections per rule and API units used, read from fetch_log, plus
// whether the YouTube API key is loaded.
export default function StatusScreen() {
  const { state, apiKey } = useStatus();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <FetchReport state={state} emptyText="No fetch yet. Open Refresh to build a list." />
        <Divider />
        <StatusRows heading="YouTube API key" rows={[{ label: 'Key', value: apiKey }]} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
});
