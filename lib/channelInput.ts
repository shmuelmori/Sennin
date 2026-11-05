// Parses what the user pastes on the Sources screen (F1) into something
// channels.list can resolve: a handle (forHandle=) or a channel ID (id=).
//
// Accepts "@handle", "youtube.com/@handle", "youtube.com/channel/UC…", with or
// without "https://", "www." or "m.", plus the "?si=…" that share links add.
// Links are parsed by hand: React Native's URL doesn't fully support hostname
// or pathname.

export type ChannelInputError =
  | 'empty'
  | 'notYouTube' // a link to another site
  | 'videoLink' // a link to a video, not a channel
  | 'legacyLink' // youtube.com/c/… or /user/…, which forHandle can't resolve
  | 'badHandle'
  | 'badChannelId'
  | 'unrecognized';

export type ChannelInput =
  | { kind: 'handle'; handle: string } // without the leading "@"
  | { kind: 'channelId'; channelId: string }
  | { kind: 'invalid'; reason: ChannelInputError };

// YouTube handles: 3 to 30 letters (any script), digits, "_", "-" or ".".
const HANDLE_PATTERN = /^[\p{L}\p{M}\p{N}._-]{3,30}$/u;
// Channel IDs: "UC" plus 22 base64url characters.
const CHANNEL_ID_PATTERN = /^UC[0-9A-Za-z_-]{22}$/;

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const VIDEO_HOSTS = new Set(['youtu.be', 'www.youtu.be']);
const VIDEO_PATHS = new Set(['watch', 'shorts', 'live', 'embed', 'v']);
const LEGACY_PATHS = new Set(['c', 'user']);

export function parseChannelInput(raw: string): ChannelInput {
  const text = raw.trim();
  if (text === '') {
    return invalid('empty');
  }
  if (text.startsWith('@')) {
    return parseHandle(text.slice(1));
  }
  if (CHANNEL_ID_PATTERN.test(text)) {
    return { kind: 'channelId', channelId: text };
  }
  return parseLink(text);
}

function parseLink(text: string): ChannelInput {
  const withoutScheme = text.replace(/^https?:\/\//i, '');
  const hostEnd = withoutScheme.search(/[/?#]/);
  const host = (hostEnd === -1 ? withoutScheme : withoutScheme.slice(0, hostEnd)).toLowerCase();
  const rest = hostEnd === -1 ? '' : withoutScheme.slice(hostEnd);

  if (VIDEO_HOSTS.has(host)) {
    return invalid('videoLink');
  }
  if (!YOUTUBE_HOSTS.has(host)) {
    return invalid(host.includes('.') ? 'notYouTube' : 'unrecognized');
  }

  const path = rest.split(/[?#]/)[0];
  const segments = path.split('/').filter((segment) => segment !== '');
  const first = segments[0];
  if (first === undefined) {
    return invalid('unrecognized');
  }

  if (first.startsWith('@')) {
    // Tabs such as /@handle/shorts or /@handle/videos still name the channel.
    const decoded = decodeSegment(first);
    return decoded === null ? invalid('badHandle') : parseHandle(decoded.slice(1));
  }
  const name = first.toLowerCase();
  if (name === 'channel') {
    const id = segments[1];
    return id !== undefined && CHANNEL_ID_PATTERN.test(id)
      ? { kind: 'channelId', channelId: id }
      : invalid('badChannelId');
  }
  if (VIDEO_PATHS.has(name)) {
    return invalid('videoLink');
  }
  if (LEGACY_PATHS.has(name)) {
    return invalid('legacyLink');
  }
  return invalid('unrecognized');
}

function parseHandle(candidate: string): ChannelInput {
  // A pasted "@handle?si=…" or "@handle/" keeps only the handle.
  const handle = candidate.split(/[/?#]/)[0];
  return HANDLE_PATTERN.test(handle) ? { kind: 'handle', handle } : invalid('badHandle');
}

/** Hebrew and other non-Latin handles arrive percent-encoded in links. */
function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function invalid(reason: ChannelInputError): ChannelInput {
  return { kind: 'invalid', reason };
}
