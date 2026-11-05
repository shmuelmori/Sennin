import {
  classifyApiError,
  describeYoutubeError,
  type YoutubeError,
  type YoutubeErrorKind,
  type YtErrorBody,
} from './youtubeErrors';

/** An error body in YouTube's format, with an old-style reason and an optional ErrorInfo reason. */
function body(message: string, reason?: string, infoReason?: string): YtErrorBody {
  return {
    error: {
      message,
      errors: reason === undefined ? [] : [{ reason }],
      details: infoReason === undefined ? undefined : [{ reason: infoReason }],
    },
  };
}

describe('classifyApiError', () => {
  it('reads a bad key from the ErrorInfo reason', () => {
    // What YouTube returns for a key that doesn't exist.
    const response = body(
      'API key not valid. Please pass a valid API key.',
      'badRequest',
      'API_KEY_INVALID',
    );
    expect(classifyApiError(400, response)).toEqual({
      kind: 'badKey',
      status: 400,
      message: 'API key not valid. Please pass a valid API key.',
    });
  });

  it.each<[string, number, YtErrorBody, YoutubeErrorKind]>([
    ['used-up quota', 403, body('quota', 'quotaExceeded'), 'quotaExceeded'],
    ['the old daily limit reason', 403, body('limit', 'dailyLimitExceeded'), 'quotaExceeded'],
    ['an old-style invalid key', 400, body('bad', 'keyInvalid'), 'badKey'],
    ['an expired key', 400, body('expired', 'badRequest', 'API_KEY_EXPIRED'), 'badKey'],
    ['an API restriction', 403, body('blocked', 'forbidden', 'API_KEY_SERVICE_BLOCKED'), 'keyRestricted'],
    ['an Android app restriction', 403, body('blocked', 'forbidden', 'API_KEY_ANDROID_APP_BLOCKED'), 'keyRestricted'],
    ['a disabled API', 403, body('disabled', 'accessNotConfigured', 'SERVICE_DISABLED'), 'keyRestricted'],
    ['a missing playlist', 404, body('not found', 'playlistNotFound'), 'notFound'],
    ['a plain 404', 404, {}, 'notFound'],
    ['a not-found reason on another status', 400, body('gone', 'channelNotFound'), 'notFound'],
    ['a server error', 500, body('backend', 'backendError'), 'other'],
    ['a generic 403', 403, body('forbidden', 'forbidden'), 'other'],
  ])('classifies %s', (_label, status, response, kind) => {
    expect(classifyApiError(status, response).kind).toBe(kind);
  });

  it('puts the quota ahead of other reasons', () => {
    const response = body('quota', 'quotaExceeded', 'API_KEY_INVALID');
    expect(classifyApiError(403, response).kind).toBe('quotaExceeded');
  });

  it('falls back to the status when the body is not JSON', () => {
    expect(classifyApiError(502, null)).toEqual({ kind: 'other', status: 502, message: 'HTTP 502' });
  });

  it('ignores reasons that are not strings', () => {
    const response = { error: { errors: [{}], details: [{ reason: undefined }] } };
    expect(classifyApiError(500, response).kind).toBe('other');
  });
});

describe('describeYoutubeError', () => {
  const kinds: YoutubeErrorKind[] = [
    'noKey',
    'badKey',
    'keyRestricted',
    'quotaExceeded',
    'notFound',
    'network',
    'other',
  ];

  it.each(kinds)('has a message for %s', (kind) => {
    expect(describeYoutubeError({ kind, status: 400, message: '' })).not.toBe('');
  });

  it('gives each kind its own message', () => {
    const messages = kinds.map((kind) => describeYoutubeError({ kind, status: 400, message: '' }));
    expect(new Set(messages).size).toBe(kinds.length);
  });

  it('includes the HTTP status for other errors', () => {
    const error: YoutubeError = { kind: 'other', status: 503, message: 'down' };
    expect(describeYoutubeError(error)).toContain('503');
  });

  it('describes an unreadable response without a status', () => {
    const error: YoutubeError = { kind: 'other', status: null, message: 'not JSON' };
    expect(describeYoutubeError(error)).not.toContain('HTTP');
  });
});
