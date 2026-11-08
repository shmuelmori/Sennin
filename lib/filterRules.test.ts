import {
  applyFilters,
  checkBlockedWords,
  checkEmbeddable,
  checkLength,
  checkLive,
  checkMinViews,
  checkQueryMatch,
  checkVertical,
  checkVideo,
  countRejectionsByRule,
  type FilterContext,
  NEW_VIDEO_GRACE_MS,
  type VideoCandidate,
} from './filterRules';
import { BLOCKED_WORDS } from './blockedWords';
import { queryTerms } from './searchQuery';

const NOW = Date.UTC(2026, 10, 6, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

function video(overrides: Partial<VideoCandidate> = {}): VideoCandidate {
  return {
    videoId: 'vid1',
    channelId: 'chanWw2',
    title: 'The tank that changed the war',
    description: '',
    tags: [],
    publishedAtMs: NOW - 10 * 24 * HOUR,
    durationSec: 59,
    embedWidth: 720,
    embedHeight: 1280,
    embeddable: true,
    viewCount: 50_000,
    liveBroadcastContent: 'none',
    hasLiveStreamingDetails: false,
    ...overrides,
  };
}

/** Every video comes from the search for `query` unless `queries` says otherwise. */
function context(queries: Record<string, string> = {}): FilterContext {
  const map = new Map(
    ['vid1', 'a', 'b', 'c', 'd'].map((id) => [id, { query: 'tank', terms: queryTerms('tank') }]),
  );
  for (const [videoId, query] of Object.entries(queries)) {
    map.set(videoId, { query, terms: queryTerms(query) });
  }
  return { nowMs: NOW, queries: map, blockedWords: BLOCKED_WORDS };
}

describe('checkLive', () => {
  it('passes a regular video', () => {
    expect(checkLive(video())).toBeNull();
  });

  it.each(['live', 'upcoming'])('rejects a %s stream', (state) => {
    expect(checkLive(video({ liveBroadcastContent: state }))).toEqual({ rule: 'live', detail: state });
  });

  it('rejects a stream that has ended', () => {
    expect(checkLive(video({ hasLiveStreamingDetails: true }))).toEqual({
      rule: 'live',
      detail: 'past live stream',
    });
  });
});

describe('checkLength', () => {
  it.each([1, 59, 180])('passes %d seconds', (durationSec) => {
    expect(checkLength(video({ durationSec }))).toBeNull();
  });

  it('rejects anything over 180 seconds', () => {
    expect(checkLength(video({ durationSec: 181 }))).toEqual({ rule: 'length', detail: '181 s' });
  });

  it.each([null, 0])('rejects a duration of %p', (durationSec) => {
    expect(checkLength(video({ durationSec }))).toEqual({ rule: 'length', detail: 'no duration' });
  });
});

describe('checkVertical', () => {
  it('passes a vertical player', () => {
    expect(checkVertical(video())).toBeNull();
  });

  it.each([
    [1280, 720, '1280x720'],
    [720, 720, '720x720'],
  ])('rejects %dx%d', (embedWidth, embedHeight, detail) => {
    expect(checkVertical(video({ embedWidth, embedHeight }))).toEqual({ rule: 'vertical', detail });
  });

  it('rejects a missing player size', () => {
    expect(checkVertical(video({ embedWidth: null }))).toEqual({
      rule: 'vertical',
      detail: 'no player size',
    });
  });
});

describe('checkEmbeddable', () => {
  it('passes an embeddable video', () => {
    expect(checkEmbeddable(video())).toBeNull();
  });

  it('rejects a video that cannot be embedded', () => {
    expect(checkEmbeddable(video({ embeddable: false }))?.rule).toBe('embeddable');
  });
});

describe('checkBlockedWords', () => {
  it('passes a clean video', () => {
    expect(checkBlockedWords(video(), BLOCKED_WORDS)).toBeNull();
  });

  it('rejects a blocked word in the title', () => {
    expect(checkBlockedWords(video({ title: 'Historian REACTS TO war films' }), BLOCKED_WORDS)).toEqual(
      { rule: 'blockedWord', detail: 'reacts to' },
    );
  });

  it('rejects a blocked word in the description', () => {
    expect(checkBlockedWords(video({ description: 'lol #meme' }), BLOCKED_WORDS)?.detail).toBe(
      '#meme',
    );
  });

  it('does not block "chain reaction"', () => {
    const title = 'The first nuclear chain reaction';
    expect(checkBlockedWords(video({ title }), BLOCKED_WORDS)).toBeNull();
  });
});

describe('checkQueryMatch', () => {
  const terms = queryTerms('black holes');

  it('passes a video with a query word in the title', () => {
    expect(checkQueryMatch(video({ title: 'What is inside a black hole?' }), terms, 'black holes')).toBeNull();
  });

  it('finds a query word in the description', () => {
    const v = video({ title: 'Space is weird', description: 'All about holes in space' });
    expect(checkQueryMatch(v, terms, 'black holes')).toBeNull();
  });

  it('finds a query word in the tags', () => {
    const v = video({ title: 'Space is weird', tags: ['astronomy', 'Black Hole'] });
    expect(checkQueryMatch(v, terms, 'black holes')).toBeNull();
  });

  it('rejects a video with no query word, naming the query', () => {
    expect(checkQueryMatch(video({ title: 'Space is weird' }), terms, 'black holes')).toEqual({
      rule: 'queryMatch',
      detail: 'no word from "black holes"',
    });
  });

  it('matches whole words only', () => {
    expect(checkQueryMatch(video({ title: 'Ironic facts' }), queryTerms('iron'), 'iron')?.rule).toBe(
      'queryMatch',
    );
  });

  it('passes when there are no terms', () => {
    expect(checkQueryMatch(video({ title: 'Anything' }), [], '')).toBeNull();
  });
});

describe('checkMinViews', () => {
  it('passes a video with enough views', () => {
    expect(checkMinViews(video({ viewCount: 1000 }), NOW)).toBeNull();
  });

  it('rejects an older video with few views', () => {
    expect(checkMinViews(video({ viewCount: 999 }), NOW)).toEqual({
      rule: 'minViews',
      detail: '999 views',
    });
  });

  it('rejects an older video with hidden views', () => {
    expect(checkMinViews(video({ viewCount: null }), NOW)?.detail).toBe('views hidden');
  });

  it('skips the rule for a video from the last 48 hours', () => {
    const v = video({ viewCount: 12, publishedAtMs: NOW - NEW_VIDEO_GRACE_MS + 1 });
    expect(checkMinViews(v, NOW)).toBeNull();
  });

  it('applies the rule from exactly 48 hours on', () => {
    const v = video({ viewCount: 12, publishedAtMs: NOW - NEW_VIDEO_GRACE_MS });
    expect(checkMinViews(v, NOW)?.rule).toBe('minViews');
  });
});

describe('checkVideo', () => {
  it('passes a video that meets every rule', () => {
    expect(checkVideo(video(), context())).toBeNull();
  });

  it('reports the first failing rule only', () => {
    const v = video({ durationSec: 600, embedWidth: 1280, embedHeight: 720, viewCount: 3 });
    expect(checkVideo(v, context())?.rule).toBe('length');
  });

  it('reports a live stream before its zero duration', () => {
    const v = video({ liveBroadcastContent: 'live', durationSec: 0 });
    expect(checkVideo(v, context())?.rule).toBe('live');
  });

  it("uses the query of the video's own search", () => {
    expect(checkVideo(video(), context({ vid1: 'octopus' }))?.rule).toBe('queryMatch');
  });

  it('runs the query match after the minimum views', () => {
    const v = video({ viewCount: 3 });
    expect(checkVideo(v, context({ vid1: 'octopus' }))?.rule).toBe('minViews');
  });

  it('skips the query match for a video with no known search', () => {
    expect(checkVideo(video({ videoId: 'unknown' }), context())).toBeNull();
  });
});

describe('applyFilters', () => {
  it('splits videos into passed and rejected, keeping order and extra fields', () => {
    const videos = [
      { ...video({ videoId: 'a' }), itemName: 'Tanks' },
      { ...video({ videoId: 'b', durationSec: 300 }), itemName: 'Tanks' },
      { ...video({ videoId: 'c', embeddable: false }), itemName: 'Tanks' },
      { ...video({ videoId: 'd' }), itemName: 'Tanks' },
    ];
    const result = applyFilters(videos, context());
    expect(result.passed.map((v) => v.videoId)).toEqual(['a', 'd']);
    expect(result.passed[0].itemName).toBe('Tanks');
    expect(result.rejected).toEqual([
      { videoId: 'b', rule: 'length', detail: '300 s' },
      { videoId: 'c', rule: 'embeddable', detail: 'not embeddable' },
    ]);
  });

  it('handles an empty list', () => {
    expect(applyFilters([], context())).toEqual({ passed: [], rejected: [] });
  });
});

describe('countRejectionsByRule', () => {
  it('counts each rule and lists every rule, with 0 for unused ones', () => {
    const counts = countRejectionsByRule([
      { rule: 'length', detail: '300 s' },
      { rule: 'vertical', detail: '1920x1080' },
      { rule: 'length', detail: '600 s' },
    ]);
    expect(counts).toEqual({
      live: 0,
      length: 2,
      vertical: 1,
      embeddable: 0,
      blockedWord: 0,
      minViews: 0,
      queryMatch: 0,
    });
  });

  it('adds up to the number of rejected videos', () => {
    const videos = [
      video({ videoId: 'a', durationSec: 300 }),
      video({ videoId: 'b', embeddable: false }),
      video({ videoId: 'c' }),
    ];
    const { rejected } = applyFilters(videos, context());
    const counts = countRejectionsByRule(rejected);
    expect(Object.values(counts).reduce((sum, n) => sum + n, 0)).toBe(rejected.length);
  });
});
