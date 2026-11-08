import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoPill } from '@/components/InfoPill';
import { RefreshButton } from '@/components/RefreshButton';
import { RefreshReport } from '@/components/RefreshReport';
import { ScriptTitle } from '@/components/ScriptTitle';
import { SenninBackdrop } from '@/components/SenninBackdrop';
import { useLastFetchReport } from '@/hooks/useLastFetchReport';
import { useRefresh } from '@/hooks/useRefresh';
import { type FetchMessage, quotaLowMessage } from '@/lib/fetchMessages';
import { canFetch } from '@/lib/quota';
import { colors, fontSize, radius, spacing } from '@/theme';

// Expo Router requires a default export for route files.
// Refresh tab (spec §4 "Refresh", F4, F12), over the Sennin background art:
// a script title, a large button that builds a new list, the last fetch's
// time, the result of the last tap, and the last fetch's report from
// fetch_log as cards (Status shows the same report as rows). With fewer than
// 2,100 API units left today the button is disabled and a message says why.
// A new list reaches the Feed through FeedListSignal. The tab stays mounted,
// so a fetch keeps running, and its report shows, if another tab is opened meanwhile.
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
  const lastFetch =
    state.status === 'ready' && state.report.hasFetch ? state.report.stats.fetchedAt : null;

  const onRefresh = async () => {
    const result = await refresh();
    if (result === null) return;
    setMessage(result.message);
    reload();
  };

  return (
    <SenninBackdrop>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <ScriptTitle text="Refresh" size="hero" align="center" />
            <Text style={styles.intro}>Draw 20 topics and build a list of up to 100 Shorts.</Text>
            <RefreshButton
              busy={refreshing}
              disabled={quotaNote !== null}
              onPress={() => void onRefresh()}
            />
            {lastFetch !== null && <InfoPill icon="time-outline" text={`Last fetch: ${lastFetch}`} />}
            {!refreshing &&
              notes.map((note) => (
                <View key={note.title} style={styles.message}>
                  <Text style={styles.messageTitle}>{note.title}</Text>
                  <Text style={styles.messageText}>{note.message}</Text>
                </View>
              ))}
          </View>
          <RefreshReport state={state} emptyText="No fetch yet." />
        </ScrollView>
      </SafeAreaView>
    </SenninBackdrop>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  intro: {
    maxWidth: 280,
    color: colors.silver,
    fontSize: fontSize.body,
    textAlign: 'center',
    textShadowColor: colors.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  message: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
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
