import {
  toCount,
  toFetchedVideo,
  toFetchedVideos,
  toSearchVideoIds,
  type YtVideo,
} from './youtubeResponses';

describe('toSearchVideoIds', () => {
  it('reads the IDs in order and drops repeats and results without one', () => {
    const response = {
      items: [
        { id: { kind: 'youtube#video', videoId: 'a' } },
        { id: { kind: 'youtube#channel' } },
        { id: { videoId: 'b' } },
        {},
        { id: { videoId: 'a' } },
        { id: { videoId: '' } },
      ],
    };
    expect(toSearchVideoIds(response)).toEqual(['a', 'b']);
  });

  it('returns no IDs when items is missing', () => {
    expect(toSearchVideoIds({})).toEqual([]);
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
    tags: ['math', 'proof'],
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
      tags: ['math', 'proof'],
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
      tags: [],
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
