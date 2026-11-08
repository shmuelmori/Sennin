import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { StatTiles, type StatTile } from '@/components/StatTiles';
import { TopicIcon } from '@/components/TopicIcon';
import { UsageRing } from '@/components/UsageRing';
import type { FetchReportState, FetchStats, ItemRow, RuleCount } from '@/lib/statusReport';
import { textDirection } from '@/lib/textDirection';
import { colors, fontSize, spacing } from '@/theme';

type Props = {
  state: FetchReportState;
  /** Shown when fetch_log is empty. */
  emptyText: string;
};

function statTiles(stats: FetchStats): StatTile[] {
  return [
    { label: 'Time', value: stats.duration, icon: 'time-outline' },
    { label: 'Videos fetched', value: stats.fetched, icon: 'film-outline' },
    { label: 'In list', value: stats.selected, icon: 'list' },
    { label: 'Passed filters', value: stats.passed, icon: 'checkmark' },
    { label: 'Rejected', value: stats.rejected, icon: 'close-circle-outline', tone: 'sunset' },
    { label: 'Topics drawn', value: stats.topicsDrawn, icon: 'pricetags-outline' },
  ];
}

function UnitsCard({ stats }: { stats: FetchStats }) {
  return (
    <GlassCard title="API Usage" icon="cloud-upload">
      <View style={styles.units}>
        <View style={styles.unitLines}>
          <Text style={styles.label}>
            Used in this fetch <Text style={styles.strong}>{stats.unitsUsed}</Text>
          </Text>
          {stats.unitsLeftToday !== null && (
            <Text style={styles.label}>
              Left today <Text style={styles.strong}>{stats.unitsLeftToday}</Text>
            </Text>
          )}
        </View>
        {stats.usedTodayPercent !== null && stats.unitsLeftToday !== null && (
          <UsageRing percent={stats.usedTodayPercent} caption={`${stats.unitsLeftToday} left`} />
        )}
      </View>
    </GlassCard>
  );
}

function TopicRows({ items }: { items: readonly ItemRow[] }) {
  return (
    <GlassCard title="Topics Drawn" icon="list">
      <Text style={styles.note}>Results / passed / in the list</Text>
      {items.map((item, index) => (
        <View key={`${index}-${item.itemId}`} style={[styles.row, index > 0 && styles.rowLine]}>
          <TopicIcon name={item.label} />
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              styles.grow,
              item.flagged && styles.flagged,
              { direction: textDirection(item.label) ?? 'inherit' },
            ]}
          >
            {item.label}
          </Text>
          <Text style={[styles.value, item.flagged && styles.flagged]}>{item.value}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

function RuleRows({ rules }: { rules: readonly RuleCount[] }) {
  return (
    <GlassCard title="Rejected by Rule" icon="funnel-outline">
      {rules.map(({ rule, label, count }) => (
        <View key={rule} style={styles.row}>
          <Text style={[styles.label, styles.grow, count === 0 && styles.muted]}>{label}</Text>
          <Text style={[styles.value, count === 0 && styles.muted]}>{count}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

// The last fetch's report on the Refresh tab (spec §4, F11) as glass cards:
// the numbers, the API units with today's use as a ring, each drawn topic
// with its results, passed and selected videos (a topic that gave none is
// flagged), every rule with what it rejected, and any error. The Status tab
// shows the same report as plain rows (FetchReport).
export function RefreshReport({ state, emptyText }: Props) {
  switch (state.status) {
    case 'loading':
      return null;
    case 'failed':
      return <Text style={[styles.note, styles.flagged]}>{state.message}</Text>;
    case 'ready': {
      const { report } = state;
      if (!report.hasFetch) {
        return <Text style={[styles.note, styles.center]}>{emptyText}</Text>;
      }
      return (
        <>
          <GlassCard title="Fetch Performance" icon="stats-chart">
            <StatTiles tiles={statTiles(report.stats)} />
          </GlassCard>
          <UnitsCard stats={report.stats} />
          {report.items.length > 0 && <TopicRows items={report.items} />}
          <RuleRows rules={report.rules} />
          {report.error !== null && (
            <GlassCard title="Problems" icon="warning-outline" tone="sunset">
              <Text style={[styles.label, styles.flagged]}>{report.error}</Text>
            </GlassCard>
          )}
        </>
      );
    }
  }
}

const styles = StyleSheet.create({
  units: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  unitLines: {
    flex: 1,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    minHeight: 40,
  },
  rowLine: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.tealMist,
  },
  grow: {
    flex: 1,
  },
  label: {
    color: colors.silver,
    fontSize: fontSize.body,
  },
  strong: {
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  value: {
    color: colors.silver,
    fontSize: fontSize.body,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  muted: {
    color: colors.silverMuted,
    fontWeight: 'normal',
  },
  flagged: {
    color: colors.cherryBlossom,
  },
  note: {
    color: colors.silverMuted,
    fontSize: fontSize.small,
  },
  center: {
    textAlign: 'center',
  },
});
