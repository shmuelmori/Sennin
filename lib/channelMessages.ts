// Text for the Sources screen when adding a channel (F1, step 5.2): why the
// input can't be used, why YouTube couldn't resolve it, or what was added.

import type { ChannelInputError } from './channelInput';
import { describeYoutubeError, type YoutubeError } from './youtubeErrors';
import type { ChannelLookup } from './youtubeRequests';

export const NO_TOPIC_MESSAGE = 'Pick a topic for the channel first.';

/** Why the pasted text isn't a channel the app can look up. */
export function describeChannelInputError(reason: ChannelInputError): string {
  switch (reason) {
    case 'empty':
      return 'Paste a channel link or @handle.';
    case 'notYouTube':
      return "That isn't a YouTube link.";
    case 'videoLink':
      return "That's a link to a video. Paste the channel's link or its @handle instead.";
    case 'legacyLink':
      return "Old /c/ and /user/ links can't be looked up. Use the channel's @handle instead.";
    case 'badHandle':
      return 'That @handle isn\'t valid. Handles have 3 to 30 letters, digits, ".", "_" or "-".';
    case 'badChannelId':
      return "The channel ID in that link isn't valid.";
    case 'unrecognized':
      return 'Paste a channel link (youtube.com/@name) or a handle that starts with @.';
  }
}

/** The handle with its "@", or the channel ID. */
export function describeLookup(lookup: ChannelLookup): string {
  return lookup.kind === 'handle' ? `@${lookup.handle}` : lookup.channelId;
}

/** Why channels.list couldn't resolve the channel. */
export function describeResolveError(error: YoutubeError, lookup: ChannelLookup): string {
  return error.kind === 'notFound'
    ? `No YouTube channel found for ${describeLookup(lookup)}.`
    : describeYoutubeError(error);
}

export function describeAdded(title: string): string {
  return `Added ${title}.`;
}

export function describeAlreadyAdded(title: string): string {
  return `${title} is already in your list.`;
}
