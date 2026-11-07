import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getLatestFetchLog } from '@/db/fetchLog';
import { buildStatusReport, type FetchReportState } from '@/lib/statusReport';

// The latest fetch_log row as a report (F11), for the Status and Refresh
// tabs. Read each time the tab opens, since tabs stay mounted and a Refresh
// adds a row, and again whenever `reload` is called (after a Refresh).
export function useLastFetchReport() {
  const db = useDatabase();
  const [state, setState] = useState<FetchReportState>({ status: 'loading' });
  // Only the latest read may set the state, so a slow earlier read can't
  // replace a newer report.
  const readCount = useRef(0);

  const reload = useCallback(() => {
    const read = ++readCount.current;
    getLatestFetchLog(db).then(
      (log) => {
        if (read !== readCount.current) return;
        setState({ status: 'ready', report: buildStatusReport(log, Date.now()) });
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

  return { state, reload };
}
