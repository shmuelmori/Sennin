// Checks the API keys read from .env (EXPO_PUBLIC_YOUTUBE_KEY and
// EXPO_PUBLIC_GEMINI_KEY), so a missing or badly pasted key is reported before
// any request is made.

export type ApiKeyCheck =
  | { ok: true; key: string }
  | { ok: false; reason: 'missing' | 'malformed' };

// Classic Google API keys are 39 characters: "AIza" plus 35 letters, digits, "-" or "_".
const API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/;

// Newer keys from Google AI Studio start with "AQ." and are longer. Their exact
// length isn't documented, so this only checks the prefix and the characters;
// a key Google doesn't accept still fails at the API with a 400/403.
const AI_STUDIO_KEY_PATTERN = /^AQ\.[0-9A-Za-z_-]{20,200}$/;

function checkKey(raw: string | undefined, patterns: readonly RegExp[]): ApiKeyCheck {
  const key = raw?.trim() ?? '';
  if (key === '') {
    return { ok: false, reason: 'missing' };
  }
  if (!patterns.some((pattern) => pattern.test(key))) {
    return { ok: false, reason: 'malformed' };
  }
  return { ok: true, key };
}

/** Checks the YouTube Data API key: classic "AIza" keys only. */
export function checkApiKey(raw: string | undefined): ApiKeyCheck {
  return checkKey(raw, [API_KEY_PATTERN]);
}

/** Checks the Gemini API key: a classic "AIza" key or a newer "AQ." AI Studio key. */
export function checkGeminiKey(raw: string | undefined): ApiKeyCheck {
  return checkKey(raw, [API_KEY_PATTERN, AI_STUDIO_KEY_PATTERN]);
}
