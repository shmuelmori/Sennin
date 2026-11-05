import type { ChannelInputError } from './channelInput';
import {
  describeAdded,
  describeAlreadyAdded,
  describeChannelInputError,
  describeLookup,
  describeResolveError,
} from './channelMessages';
import { describeYoutubeError, type YoutubeError } from './youtubeErrors';

const ALL_INPUT_ERRORS: ChannelInputError[] = [
  'empty',
  'notYouTube',
  'videoLink',
  'legacyLink',
  'badHandle',
  'badChannelId',
  'unrecognized',
];

describe('describeChannelInputError', () => {
  it('has its own text for every reason', () => {
    const texts = ALL_INPUT_ERRORS.map(describeChannelInputError);
    expect(new Set(texts).size).toBe(ALL_INPUT_ERRORS.length);
    for (const text of texts) {
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('points video links and old links to the @handle', () => {
    expect(describeChannelInputError('videoLink')).toContain('@handle');
    expect(describeChannelInputError('legacyLink')).toContain('@handle');
  });
});

describe('describeLookup', () => {
  it('shows a handle with its "@"', () => {
    expect(describeLookup({ kind: 'handle', handle: '3blue1brown' })).toBe('@3blue1brown');
  });

  it('shows a Hebrew handle as it is', () => {
    expect(describeLookup({ kind: 'handle', handle: 'היסטוריה' })).toBe('@היסטוריה');
  });

  it('shows a channel ID as it is', () => {
    const channelId = 'UCYO_jab_esuFRV4b17AJtAw';
    expect(describeLookup({ kind: 'channelId', channelId })).toBe(channelId);
  });
});

describe('describeResolveError', () => {
  it('names the handle when no channel has it', () => {
    const error: YoutubeError = { kind: 'notFound', status: null, message: 'no channel' };
    expect(describeResolveError(error, { kind: 'handle', handle: 'nobody-here' })).toBe(
      'No YouTube channel found for @nobody-here.',
    );
  });

  it('uses the general text for other errors', () => {
    const error: YoutubeError = { kind: 'quotaExceeded', status: 403, message: 'quota' };
    expect(describeResolveError(error, { kind: 'handle', handle: 'x' })).toBe(
      describeYoutubeError(error),
    );
  });
});

describe('describeAdded and describeAlreadyAdded', () => {
  it('name the channel', () => {
    expect(describeAdded('3Blue1Brown')).toBe('Added 3Blue1Brown.');
    expect(describeAlreadyAdded('3Blue1Brown')).toBe('3Blue1Brown is already in your list.');
  });
});
