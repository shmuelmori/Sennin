import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Divider } from '@/components/Divider';
import { FetchReport } from '@/components/FetchReport';
import { RefreshButton } from '@/components/RefreshButton';
import { useLastFetchReport } from '@/hooks/useLastFetchReport';
import { useRefresh } from '@/hooks/useRefresh';
import { type FetchMessage, quotaLowMessage } from '@/lib/fetchMessages';
import { canFetch } from '@/lib/quota';
import { colors, fontSize, spacing } from '@/theme';

// Expo Router requires a default export for route files.
// Refresh tab (spec §4 "Refresh", F4, F12): a large button that builds a new
// list, and under it the result of the last tap and the last fetch's report
// from fetch_log (the same one Status shows). With fewer than 2,100 API
// units left today the button is disabled and a message says why. A new
// list reaches the Feed through FeedListSignal. The tab stays mounted, so a
// fetch keeps running, and its report shows, if another tab is opened meanwhile.
export default function RefreshScreen() {
  const { refreshing, refresh } = useRefresh();
  const { state, unitsUsedToday, reload } = useLastFetchReport();
  const [message, setMessage] = useState<FetchMessage | null>(null);
  // An unreadable count doesn't block: useRefresh checks again before fetching.
  const quotaNote =
    unitsUsedToday !== null && !canFetch(unitsUsedToday) ? quotaLowMessage(unitsUsedToday) : null;
  // The last tap's result, then why the button is off, without saying the same thing twice.
  const notes: FetchMessage[] = [];
  if (message !== null && message.title !== quotaNote?.title) notes.push(message);
  if (quotaNote !== null) notes.push(quotaNote);

  const onRefresh = async () => {
    const result = await refresh();
    if (result === null) return;
    setMessage(result.message);
    reload();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Text style={styles.intro}>Draw 20 topics and build a list of up to 100 Shorts.</Text>
          <RefreshButton
            busy={refreshing}
            disabled={quotaNote !== null}
            onPress={() => void onRefresh()}
          />
          {!refreshing &&
            notes.map((note) => (
              <View key={note.title} style={styles.message}>
                <Text style={styles.messageTitle}>{note.title}</Text>
                <Text style={styles.messageText}>{note.message}</Text>
              </View>
            ))}
        </View>
        <Divider />
        <FetchReport state={state} emptyText="No fetch yet." />
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
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  top: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  intro: {
    color: colors.silver,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  message: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  messageTitle: {
    color: colors.silver,
    fontSize: fontSize.body,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  messageText: {
    color: colors.silver,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
