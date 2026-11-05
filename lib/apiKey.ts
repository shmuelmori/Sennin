// Checks the YouTube Data API key read from EXPO_PUBLIC_YOUTUBE_KEY, so a
// missing or badly pasted key is reported before any request is made.

export type ApiKeyCheck =
  | { ok: true; key: string }
  | { ok: false; reason: 'missing' | 'malformed' };

// Google API keys are 39 characters: "AIza" plus 35 letters, digits, "-" or "_".
const API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/;

export function checkApiKey(raw: string | undefined): ApiKeyCheck {
  const key = raw?.trim() ?? '';
  if (key === '') {
    return { ok: false, reason: 'missing' };
  }
  if (!API_KEY_PATTERN.test(key)) {
    return { ok: false, reason: 'malformed' };
  }
  return { ok: true, key };
}
