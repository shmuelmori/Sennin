import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getLatestFetchLog } from '@/db/fetchLog';
import { getUnitsUsed } from '@/db/quota';
import { pacificDate } from '@/lib/quota';
import { buildStatusReport, type FetchReportState } from '@/lib/statusReport';

// The latest fetch_log row as a report (F11), for the Status and Refresh
// tabs, with today's API units from quota_day. Read each time the tab opens,
// since tabs stay mounted and a Refresh adds a row, and again whenever
// `reload` is called (after a Refresh). The Refresh tab also uses
// `unitsUsedToday` to disable its button when the quota is low (F12).

/** Today's units, or null if quota_day couldn't be read. */
async function readUnitsToday(read: () => Promise<number>): Promise<number | null> {
  try {
    return await read();
  } catch (cause) {
    console.log(`[status] reading quota_day failed: ${String(cause)}`);
    return null;
  }
}

export function useLastFetchReport() {
  const db = useDatabase();
  const [state, setState] = useState<FetchReportState>({ status: 'loading' });
  const [unitsUsedToday, setUnitsUsedToday] = useState<number | null>(null);
  // Only the latest read may set the state, so a slow earlier read can't
  // replace a newer report.
  const readCount = useRef(0);

  const reload = useCallback(() => {
    const read = ++readCount.current;
    const nowMs = Date.now();
    Promise.all([
      getLatestFetchLog(db),
      readUnitsToday(() => getUnitsUsed(db, pacificDate(nowMs))),
    ]).then(
      ([log, units]) => {
        if (read !== readCount.current) return;
        setUnitsUsedToday(units);
        setState({ status: 'ready', report: buildStatusReport(log, nowMs, units) });
      },
      (cause: unknown) => {
        console.log(`[status] reading fetch_log failed: ${String(cause)}`);
        if (read !== readCount.current) return;
        setState({ status: 'failed', message: "Couldn't read the last fetch." });
      },
    );
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
      return () => {
        // Leaving the tab: drop any read still running.
        readCount.current++;
      };
    }, [reload]),
  );

  return { state, unitsUsedToday, reload };
}
