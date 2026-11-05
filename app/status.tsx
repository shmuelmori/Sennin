import { Stack } from 'expo-router';

import { HeaderButton } from '@/components/HeaderButton';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { useYoutubeTest, type YoutubeTestState } from '@/hooks/useYoutubeTest';
import { readApiKey } from '@/services/youtube';

function testLine(state: YoutubeTestState): string {
  switch (state.status) {
    case 'idle':
      return 'API test: not run yet';
    case 'running':
      return 'API test: running…';
    case 'passed':
      return `API test passed. ${state.summary}`;
    case 'failed':
      return `API test failed. ${state.summary}`;
  }
}

// Status screen (spec §4, F11). Step 8.1 adds the fetch_log details. The API
// test button is temporary (step 4.1), until "Add a channel" exists (step 5.2).
export default function StatusScreen() {
  const apiKey = readApiKey();
  const youtubeTest = useYoutubeTest();
  const keyStatus = apiKey.ok
    ? `YouTube API key loaded (…${apiKey.key.slice(-4)})`
    : apiKey.reason === 'missing'
      ? 'YouTube API key missing: add it to .env'
      : "YouTube API key in .env doesn't look valid";

  return (
    <>
      <Stack.Screen options={{ title: 'Status' }} />
      <ScreenPlaceholder
        title="Status"
        lines={['No fetch yet.', keyStatus, testLine(youtubeTest.state)]}
      >
        <HeaderButton label="Test YouTube API" onPress={youtubeTest.run} />
      </ScreenPlaceholder>
    </>
  );
}
