import { StyleSheet, Text } from 'react-native';

import { Divider } from '@/components/Divider';
import { StatusRows } from '@/components/StatusRows';
import type { FetchReportState } from '@/lib/statusReport';
import { colors, fontSize } from '@/theme';

type Props = {
  state: FetchReportState;
  /** Shown when fetch_log is empty. */
  emptyText: string;
};

// The last fetch's report (spec §4, F11): time, duration, counts and units,
// each drawn topic with its results, passed and selected videos (a topic
// that gave none is flagged), every rule in the §5 order with what it
// rejected, and any error. The Status and Refresh tabs both show it. The
// parent lays the sections out.
export function FetchReport({ state, emptyText }: Props) {
  switch (state.status) {
    case 'loading':
      return null;
    case 'failed':
      return <Text style={[styles.note, styles.error]}>{state.message}</Text>;
    case 'ready': {
      const { report } = state;
      if (!report.hasFetch) {
        return <Text style={styles.note}>{emptyText}</Text>;
      }
      return (
        <>
          <StatusRows heading="Last fetch" rows={report.summary} />
          {report.items.length > 0 && (
            <>
              <Divider />
              <StatusRows
                heading="Topics drawn"
                note="Results / passed / in the list"
                rows={report.items}
              />
            </>
          )}
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

const styles = StyleSheet.create({
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
