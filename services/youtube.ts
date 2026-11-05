// The only file that talks to the YouTube Data API (CLAUDE.md).
// Step 4.1 adds the typed client and the quota counter here.

import { checkApiKey, type ApiKeyCheck } from '@/lib/apiKey';

// Expo inlines EXPO_PUBLIC_* variables into the bundle, and only for a direct
// `process.env.NAME` read. Don't destructure process.env or index it by a variable.
export function readApiKey(): ApiKeyCheck {
  return checkApiKey(process.env.EXPO_PUBLIC_YOUTUBE_KEY);
}
