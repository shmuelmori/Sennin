import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getGeminiRequests } from '@/db/quota';
import { useLastFetchReport } from '@/hooks/useLastFetchReport';
import { pacificDate } from '@/lib/quota';
import { describeApiKeyStatus } from '@/lib/statusReport';
import { readGeminiKey } from '@/services/gemini';
import { readApiKey } from '@/services/youtube';

// The Status screen's data (F11, step 8.1): the latest fetch_log row as a
// report, read each time the tab opens, whether the API keys are loaded, and
// how many Gemini requests (ⓘ) were sent today (Pacific Time day).
export function useStatus() {
  const db = useDatabase();
  const { state } = useLastFetchReport();
  const [apiKey] = useState(() => describeApiKeyStatus(readApiKey()));
  const [geminiKey] = useState(() => describeApiKeyStatus(readGeminiKey()));
  /** null while reading, or if quota_day couldn't be read. */
  const [geminiRequestsToday, setGeminiRequestsToday] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getGeminiRequests(db, pacificDate(Date.now())).then(
        (count) => {
          if (active) setGeminiRequestsToday(count);
        },
        (cause: unknown) => {
          console.log(`[status] reading Gemini requests failed: ${String(cause)}`);
          if (active) setGeminiRequestsToday(null);
        },
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  return { state, apiKey, geminiKey, geminiRequestsToday };
}
