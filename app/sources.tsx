import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Sources screen (spec §4). Phase 5 adds the channel list.
export default function SourcesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sources' }} />
      <ScreenPlaceholder title="Sources" lines={['Your channels will appear here.']} />
    </>
  );
}
