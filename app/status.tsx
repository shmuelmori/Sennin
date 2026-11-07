import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Divider } from '@/components/Divider';
import { StatusRows } from '@/components/StatusRows';
import { useStatus, type StatusState } from '@/hooks/useStatus';
import { colors, fontSize, spacing } from '@/theme';

function FetchDetails({ state }: { state: StatusState }) {
  switch (state.status) {
    case 'loading':
      return null;
    case 'failed':
      return <Text style={[styles.note, styles.error]}>{state.message}</Text>;
    case 'ready': {
      const { report } = state;
      if (!report.hasFetch) {
        return <Text style={styles.note}>No fetch yet. Open Refresh to build a list.</Text>;
      }
      return (
        <>
          <StatusRows heading="Last fetch" rows={report.summary} />
          <Divider />
          <StatusRows
            heading="Rejected by rule"
            rows={report.rules.map(({ label, count }) => ({
              label,
              value: String(count),
              muted: count === 0,
            }))}
          />
          {report.error !== null && (
            <>
              <Divider />
              <Text style={styles.heading}>Problems</Text>
              <Text style={[styles.note, styles.error]}>{report.error}</Text>
            </>
          )}
        </>
      );
    }
  }
}

// Status screen (spec §4, F11): the last fetch's time, videos fetched,
// rejections per rule and API units used, read from fetch_log, plus whether
// the YouTube API key is loaded.
export default function StatusScreen() {
  const { state, apiKey } = useStatus();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <FetchDetails state={state} />
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
  heading: {
    color: colors.cherryBlossom,
    fontSize: fontSize.small,
    fontWeight: 'bold',
  },
  note: {
    color: colors.silverMuted,
    fontSize: fontSize.body,
  },
  error: {
    color: colors.cherryBlossom,
  },
});
