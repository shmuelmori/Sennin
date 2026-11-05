import {
  toCount,
  toFetchedVideo,
  toFetchedVideos,
  toResolvedChannel,
  toVideoIds,
  type YtChannel,
  type YtVideo,
} from './youtubeResponses';

const CHANNEL: YtChannel = {
  id: 'UCYO_jab_esuFRV4b17AJtAw',
  snippet: {
    title: '3Blue1Brown',
    thumbnails: {
      default: { url: 'https://yt3.example/88.jpg' },
      medium: { url: 'https://yt3.example/240.jpg' },
      high: { url: 'https://yt3.example/800.jpg' },
    },
  },
  contentDetails: { relatedPlaylists: { uploads: 'UUYO_jab_esuFRV4b17AJtAw' } },
};

describe('toResolvedChannel', () => {
  it('reads the ID, title, uploads playlist and the 240 px thumbnail', () => {
    expect(toResolvedChannel(CHANNEL)).toEqual({
      channelId: 'UCYO_jab_esuFRV4b17AJtAw',
      title: '3Blue1Brown',
      uploadsPlaylistId: 'UUYO_jab_esuFRV4b17AJtAw',
      thumbnailUrl: 'https://yt3.example/240.jpg',
    });
  });

  it('falls back to another thumbnail, or none', () => {
    const onlyDefault = { ...CHANNEL, snippet: { title: 'x', thumbnails: { default: { url: 'd' } } } };
    expect(toResolvedChannel(onlyDefault)?.thumbnailUrl).toBe('d');
    expect(toResolvedChannel({ ...CHANNEL, snippet: { title: 'x' } })?.thumbnailUrl).toBeNull();
  });

  it('uses the channel ID when the title is missing', () => {
    expect(toResolvedChannel({ ...CHANNEL, snippet: undefined })?.title).toBe(CHANNEL.id);
  });

  it('returns null without an ID or an uploads playlist', () => {
    expect(toResolvedChannel({ ...CHANNEL, id: undefined })).toBeNull();
    expect(toResolvedChannel({ ...CHANNEL, contentDetails: { relatedPlaylists: {} } })).toBeNull();
    expect(toResolvedChannel({})).toBeNull();
  });
});

describe('toVideoIds', () => {
  it('reads the IDs in order and drops repeats and items without one', () => {
    const response = {
      items: [
        { contentDetails: { videoId: 'a' } },
        { contentDetails: {} },
        { contentDetails: { videoId: 'b' } },
        {},
        { contentDetails: { videoId: 'a' } },
        { contentDetails: { videoId: '' } },
      ],
    };
    expect(toVideoIds(response)).toEqual(['a', 'b']);
  });

  it('returns no IDs when items is missing', () => {
    expect(toVideoIds({})).toEqual([]);
  });
});

describe('toCount', () => {
  it.each<[string | number | undefined, number | null]>([
    ['12345', 12345],
    [1080, 1080],
    ['0', 0],
    ['', null],
    [undefined, null],
    ['abc', null],
  ])('reads %p as %p', (value, expected) => {
    expect(toCount(value)).toBe(expected);
  });
});

const VIDEO: YtVideo = {
  id: 'abc123',
  snippet: {
    channelId: 'UCYO_jab_esuFRV4b17AJtAw',
    channelTitle: '3Blue1Brown',
    title: 'A short proof',
    description: 'Geometry',
    publishedAt: '2026-11-01T12:00:00Z',
    liveBroadcastContent: 'none',
  },
  contentDetails: { duration: 'PT1M5S' },
  statistics: { viewCount: '250000' },
  status: { embeddable: true },
  player: { embedWidth: '608', embedHeight: '1080' },
};

describe('toFetchedVideo', () => {
  it('maps every field the filters and the feed use', () => {
    expect(toFetchedVideo(VIDEO)).toEqual({
      videoId: 'abc123',
      channelId: 'UCYO_jab_esuFRV4b17AJtAw',
      channelTitle: '3Blue1Brown',
      title: 'A short proof',
      description: 'Geometry',
      publishedAtMs: Date.UTC(2026, 10, 1, 12, 0, 0),
      durationSec: 65,
      embedWidth: 608,
      embedHeight: 1080,
      embeddable: true,
      viewCount: 250000,
      liveBroadcastContent: 'none',
      hasLiveStreamingDetails: false,
    });
  });

  it('reads player sizes sent as numbers', () => {
    const video = toFetchedVideo({ ...VIDEO, player: { embedWidth: 1920, embedHeight: 1080 } });
    expect([video?.embedWidth, video?.embedHeight]).toEqual([1920, 1080]);
  });

  it('marks live stream details, even when empty', () => {
    expect(toFetchedVideo({ ...VIDEO, liveStreamingDetails: {} })?.hasLiveStreamingDetails).toBe(true);
  });

  it('uses safe defaults for missing parts', () => {
    expect(toFetchedVideo({ id: 'x' })).toEqual({
      videoId: 'x',
      channelId: '',
      channelTitle: '',
      title: '',
      description: '',
      publishedAtMs: 0,
      durationSec: null,
      embedWidth: null,
      embedHeight: null,
      embeddable: false,
      viewCount: null,
      liveBroadcastContent: 'none',
      hasLiveStreamingDetails: false,
    });
  });

  it('treats a bad date as old and a bad duration as unknown', () => {
    const video = toFetchedVideo({
      ...VIDEO,
      snippet: { ...VIDEO.snippet, publishedAt: 'yesterday' },
      contentDetails: { duration: '1:05' },
    });
    expect(video?.publishedAtMs).toBe(0);
    expect(video?.durationSec).toBeNull();
  });

  it('keeps hidden view counts as null', () => {
    expect(toFetchedVideo({ ...VIDEO, statistics: {} })?.viewCount).toBeNull();
  });

  it('returns null without an ID', () => {
    expect(toFetchedVideo({ ...VIDEO, id: undefined })).toBeNull();
  });
});

describe('toFetchedVideos', () => {
  it('maps the items and drops those without an ID', () => {
    const videos = toFetchedVideos({ items: [VIDEO, { snippet: {} }, { ...VIDEO, id: 'def456' }] });
    expect(videos.map((video) => video.videoId)).toEqual(['abc123', 'def456']);
  });

  it('returns no videos when items is missing', () => {
    expect(toFetchedVideos({})).toEqual([]);
  });
});
