import { parseChannelInput } from './channelInput';

const CHANNEL_ID = 'UCYO_jab_esuFRV4b17AJtAw';

describe('parseChannelInput', () => {
  describe('handles', () => {
    it.each([
      ['@3blue1brown', '3blue1brown'],
      ['  @EpicHistoryTV  ', 'EpicHistoryTV'],
      ['@some.name_1-2', 'some.name_1-2'],
      ['@שלום', 'שלום'],
      ['@handle?si=abc123', 'handle'],
      ['@handle/', 'handle'],
      ['youtube.com/@3blue1brown', '3blue1brown'],
      ['https://www.youtube.com/@3blue1brown', '3blue1brown'],
      ['http://youtube.com/@3blue1brown', '3blue1brown'],
      ['https://m.youtube.com/@3blue1brown', '3blue1brown'],
      ['HTTPS://WWW.YOUTUBE.COM/@3blue1brown', '3blue1brown'],
      ['https://youtube.com/@3blue1brown?si=Xy_12-ab', '3blue1brown'],
      ['https://www.youtube.com/@3blue1brown/shorts', '3blue1brown'],
      ['https://www.youtube.com/@3blue1brown/videos?view=0', '3blue1brown'],
      ['https://www.youtube.com/@3blue1brown#about', '3blue1brown'],
      ['https://www.youtube.com/@%D7%A9%D7%9C%D7%95%D7%9D', 'שלום'],
    ])('reads %p as handle %p', (raw, handle) => {
      expect(parseChannelInput(raw)).toEqual({ kind: 'handle', handle });
    });

    it.each([
      ['too short', '@ab'],
      ['too long', '@' + 'a'.repeat(31)],
      ['a space inside', '@two words'],
      ['a symbol', '@hand!e'],
      ['only "@"', '@'],
      ['bad percent-encoding in a link', 'youtube.com/@%E0%A4%A'],
      ['too short in a link', 'youtube.com/@ab'],
    ])('rejects a handle with %s', (_label, raw) => {
      expect(parseChannelInput(raw)).toEqual({ kind: 'invalid', reason: 'badHandle' });
    });
  });

  describe('channel IDs', () => {
    it.each([
      CHANNEL_ID,
      `youtube.com/channel/${CHANNEL_ID}`,
      `https://www.youtube.com/channel/${CHANNEL_ID}`,
      `https://m.youtube.com/channel/${CHANNEL_ID}?si=abc`,
      `https://www.youtube.com/channel/${CHANNEL_ID}/shorts`,
    ])('reads %p as a channel ID', (raw) => {
      expect(parseChannelInput(raw)).toEqual({ kind: 'channelId', channelId: CHANNEL_ID });
    });

    it.each([
      ['too short', 'youtube.com/channel/UCabc'],
      ['the wrong prefix', `youtube.com/channel/UX${CHANNEL_ID.slice(2)}`],
      ['no ID', 'youtube.com/channel/'],
    ])('rejects a channel link with %s', (_label, raw) => {
      expect(parseChannelInput(raw)).toEqual({ kind: 'invalid', reason: 'badChannelId' });
    });
  });

  describe('other input', () => {
    it.each([
      ['empty', ''],
      ['empty', '   '],
      ['videoLink', 'https://www.youtube.com/watch?v=V_uq3v6xK-4'],
      ['videoLink', 'https://youtube.com/shorts/V_uq3v6xK-4?si=abc'],
      ['videoLink', 'https://youtu.be/V_uq3v6xK-4'],
      ['videoLink', 'https://www.youtube.com/live/abc123'],
      ['legacyLink', 'https://www.youtube.com/c/3blue1brown'],
      ['legacyLink', 'https://www.youtube.com/user/someone'],
      ['notYouTube', 'https://vimeo.com/@someone'],
      ['notYouTube', 'https://notyoutube.com/@someone'],
      ['unrecognized', 'https://www.youtube.com/'],
      ['unrecognized', 'https://www.youtube.com/feed/subscriptions'],
      ['unrecognized', '3blue1brown'],
    ])('reports %s for %p', (reason, raw) => {
      expect(parseChannelInput(raw)).toEqual({ kind: 'invalid', reason });
    });
  });
});
