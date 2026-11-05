import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { readApiKey } from '@/services/youtube';

// Status screen (spec §4, F11). Step 8.1 adds the fetch_log details.
export default function StatusScreen() {
  const apiKey = readApiKey();
  const keyStatus = apiKey.ok
    ? `YouTube API key loaded (…${apiKey.key.slice(-4)})`
    : apiKey.reason === 'missing'
      ? 'YouTube API key missing: add it to .env'
      : "YouTube API key in .env doesn't look valid";

  return (
    <>
      <Stack.Screen options={{ title: 'Status' }} />
      <ScreenPlaceholder title="Status" lines={['No fetch yet.', keyStatus]} />
    </>
  );
}
