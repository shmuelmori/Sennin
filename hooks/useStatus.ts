import { useState } from 'react';

import { useLastFetchReport } from '@/hooks/useLastFetchReport';
import { describeApiKeyStatus } from '@/lib/statusReport';
import { readApiKey } from '@/services/youtube';

// The Status screen's data (F11, step 8.1): the latest fetch_log row as a
// report, read each time the tab opens, and whether the API key is loaded.
export function useStatus() {
  const { state } = useLastFetchReport();
  const [apiKey] = useState(() => describeApiKeyStatus(readApiKey()));
  return { state, apiKey };
}
