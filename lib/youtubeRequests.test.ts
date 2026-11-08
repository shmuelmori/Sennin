import {
  buildQuery,
  chunk,
  EMBED_MAX_HEIGHT,
  MAX_PER_REQUEST,
  searchParams,
  videosParams,
} from './youtubeRequests';

describe('searchParams', () => {
  it('asks for 25 English short videos with moderate safe search', () => {
    expect(searchParams({ q: 'octopus explained', order: 'viewCount' })).toEqual({
      part: 'id',
      q: 'octopus explained',
      type: 'video',
      videoDuration: 'short',
      relevanceLanguage: 'en',
      safeSearch: 'moderate',
      maxResults: '25',
      order: 'viewCount',
    });
  });
});

describe('videosParams', () => {
  it('asks for every part the filters need, plus maxHeight for the player size', () => {
    const params = videosParams(['a', 'b']);
    expect(params.id).toBe('a,b');
    expect(params.maxHeight).toBe(String(EMBED_MAX_HEIGHT));
    expect(params.part.split(',').sort()).toEqual(
      ['contentDetails', 'liveStreamingDetails', 'player', 'snippet', 'statistics', 'status'],
    );
  });

  it('keeps maxHeight in the range YouTube accepts', () => {
    expect(EMBED_MAX_HEIGHT).toBeGreaterThanOrEqual(72);
    expect(EMBED_MAX_HEIGHT).toBeLessThanOrEqual(8192);
  });

  it('accepts exactly 50 IDs', () => {
    const ids = Array.from({ length: MAX_PER_REQUEST }, (_, i) => `v${i}`);
    expect(videosParams(ids).id.split(',')).toHaveLength(50);
  });

  it('rejects an empty batch or more than 50 IDs', () => {
    expect(() => videosParams([])).toThrow(RangeError);
    const ids = Array.from({ length: MAX_PER_REQUEST + 1 }, (_, i) => `v${i}`);
    expect(() => videosParams(ids)).toThrow(RangeError);
  });
});

describe('buildQuery', () => {
  it('joins the parameters in order', () => {
    expect(buildQuery({ part: 'snippet', maxResults: '50' })).toBe('part=snippet&maxResults=50');
  });

  it('percent-encodes "@", commas and Hebrew', () => {
    expect(buildQuery({ forHandle: '@שלום', id: 'a,b' })).toBe(
      'forHandle=%40%D7%A9%D7%9C%D7%95%D7%9D&id=a%2Cb',
    );
  });

  it('encodes characters that would break the query', () => {
    expect(buildQuery({ q: 'a&b=c d' })).toBe('q=a%26b%3Dc%20d');
  });

  it('returns an empty string for no parameters', () => {
    expect(buildQuery({})).toBe('');
  });
});

describe('chunk', () => {
  it('splits into groups of the given size, with the rest last', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('keeps 120 IDs in 3 requests: 50, 50 and 20', () => {
    const ids = Array.from({ length: 120 }, (_, i) => i);
    expect(chunk(ids, MAX_PER_REQUEST).map((group) => group.length)).toEqual([50, 50, 20]);
  });

  it('returns no groups for no items', () => {
    expect(chunk([], 50)).toEqual([]);
  });

  it.each([0, -1, 1.5, NaN])('rejects the size %p', (size) => {
    expect(() => chunk([1], size)).toThrow(RangeError);
  });
});
