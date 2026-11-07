import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getLatestFetchLog } from '@/db/fetchLog';
import { describeApiKeyStatus, buildStatusReport, type StatusReport } from '@/lib/statusReport';
import { readApiKey } from '@/services/youtube';

// The Status screen's data (F11, step 8.1): the latest fetch_log row as a
// report, and whether the API key is loaded. Read each time the Status tab
// opens: tabs stay mounted, and a Refresh on the Refresh tab adds a row.

export type StatusState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; report: StatusReport };

export function useStatus() {
  const db = useDatabase();
  const [state, setState] = useState<StatusState>({ status: 'loading' });
  const [apiKey] = useState(() => describeApiKeyStatus(readApiKey()));

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getLatestFetchLog(db).then(
        (log) => {
          if (active)
            setState({
              status: 'ready',
              report: buildStatusReport(log, Date.now()),
            });
        },
        (cause: unknown) => {
          console.log(`[status] reading fetch_log failed: ${String(cause)}`);
          if (active)
            setState({
              status: 'failed',
              message: "Couldn't read the last fetch.",
            });
        },
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  return { state, apiKey };
}
