// Sorts YouTube Data API failures into the few kinds the app reacts to
// differently, and turns them into text for the screens (steps 5.2 and 6.2).

export type YoutubeErrorKind =
  | 'noKey' // EXPO_PUBLIC_YOUTUBE_KEY is missing or malformed, so no request was sent
  | 'badKey' // YouTube rejected the key (invalid or expired)
  | 'keyRestricted' // the key may not call this API (its restrictions, or the API is disabled)
  | 'quotaExceeded' // the 10,000 daily units are used up
  | 'notFound' // what was asked for doesn't exist
  | 'network' // no response: offline or timed out
  | 'other'; // any other HTTP error, or a response that isn't JSON

export type YoutubeError = {
  kind: YoutubeErrorKind;
  /** HTTP status, or null if no response arrived. */
  status: number | null;
  /** YouTube's own message, or the exception text, for the logs. */
  message: string;
};

export type YoutubeResult<T> = { ok: true; value: T } | { ok: false; error: YoutubeError };

/** The parts of YouTube's error body the classifier reads. */
export type YtErrorBody = {
  error?: {
    message?: string;
    /** The older format: reasons such as "quotaExceeded" or "keyInvalid". */
    errors?: { reason?: string }[];
    /** The newer format: ErrorInfo entries with reasons such as "API_KEY_INVALID". */
    details?: { reason?: string }[];
  };
};

const QUOTA_REASONS = new Set(['quotaExceeded', 'dailyLimitExceeded']);
const BAD_KEY_REASONS = new Set(['keyInvalid', 'keyExpired', 'API_KEY_INVALID', 'API_KEY_EXPIRED']);
const KEY_RESTRICTED_REASONS = new Set([
  'accessNotConfigured',
  'ipRefererBlocked',
  'SERVICE_DISABLED',
  'API_KEY_SERVICE_BLOCKED',
  'API_KEY_HTTP_REFERRER_BLOCKED',
  'API_KEY_IP_ADDRESS_BLOCKED',
  'API_KEY_ANDROID_APP_BLOCKED',
  'API_KEY_IOS_APP_BLOCKED',
]);
const NOT_FOUND_REASONS = new Set(['playlistNotFound', 'channelNotFound', 'videoNotFound']);

function errorReasons(body: YtErrorBody | null): string[] {
  const error = body?.error;
  return [...(error?.errors ?? []), ...(error?.details ?? [])]
    .map((entry) => entry.reason)
    .filter((reason): reason is string => typeof reason === 'string');
}

function hasReason(reasons: readonly string[], set: ReadonlySet<string>): boolean {
  return reasons.some((reason) => set.has(reason));
}

/** Classifies a non-2xx response. `body` is the parsed JSON, or null if it wasn't JSON. */
export function classifyApiError(status: number, body: YtErrorBody | null): YoutubeError {
  const reasons = errorReasons(body);
  const message = body?.error?.message ?? `HTTP ${status}`;
  const kind: YoutubeErrorKind = hasReason(reasons, QUOTA_REASONS)
    ? 'quotaExceeded'
    : hasReason(reasons, BAD_KEY_REASONS)
      ? 'badKey'
      : hasReason(reasons, KEY_RESTRICTED_REASONS)
        ? 'keyRestricted'
        : status === 404 || hasReason(reasons, NOT_FOUND_REASONS)
          ? 'notFound'
          : 'other';
  return { kind, status, message };
}

/** A short explanation for the user. */
export function describeYoutubeError(error: YoutubeError): string {
  switch (error.kind) {
    case 'noKey':
      return 'The YouTube API key in .env is missing or not valid.';
    case 'badKey':
      return 'YouTube rejected the API key. Check EXPO_PUBLIC_YOUTUBE_KEY in .env.';
    case 'keyRestricted':
      return "The API key isn't allowed to call the YouTube Data API. Check its restrictions in Google Cloud.";
    case 'quotaExceeded':
      return "Today's YouTube API quota is used up. It resets at midnight Pacific time.";
    case 'notFound':
      return "YouTube couldn't find it.";
    case 'network':
      return "Couldn't reach YouTube. Check the internet connection.";
    case 'other':
      return error.status === null
        ? 'YouTube sent a response the app could not read.'
        : `YouTube returned an error (HTTP ${error.status}).`;
  }
}
