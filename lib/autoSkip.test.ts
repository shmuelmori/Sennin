import { applySkip, formatSkipLine, isSkipError, planSkip } from './autoSkip';
import { feedVideos } from './feedPages';
import type { FeedItem, FeedStatus } from './records';

function item(
  videoId: string,
  position: number,
  overrides: { isReserve?: boolean; status?: FeedStatus } = {},
): FeedItem {
  return {
    position,
    videoId,
    channelId: 'UC123',
    channelTitle: 'Channel',
    title: `Video ${videoId}`,
    durationSec: 60,
    isReserve: overrides.isReserve ?? false,
    status: overrides.status ?? 'unseen',
  };
}

const list = [
  item('a', 0),
  item('b', 1),
  item('c', 2),
  item('r1', 3, { isReserve: true }),
  item('r2', 4, { isReserve: true }),
];

describe('isSkipError', () => {
  it('skips videos that can never play here', () => {
    expect(isSkipError('video_not_found')).toBe(true);
    expect(isSkipError('embed_not_allowed')).toBe(true);
    expect(isSkipError('invalid_parameter')).toBe(true);
  });

  it("doesn't skip on an HTML5 player error, which a weak connection can cause", () => {
    expect(isSkipError('HTML5_error')).toBe(false);
  });

  it("doesn't skip on an unknown error", () => {
    expect(isSkipError('')).toBe(false);
    expect(isSkipError('something_else')).toBe(false);
  });
});

describe('planSkip', () => {
  it('replaces the video with the first reserve video', () => {
    const plan = planSkip(list, 'b');
    expect(plan?.skipped.videoId).toBe('b');
    expect(plan?.replacement?.videoId).toBe('r1');
  });

  it('passes over reserve videos that were already used or skipped', () => {
    const items = [
      item('a', 0),
      item('r0', 1, { isReserve: true, status: 'skipped' }),
      item('r1', 2, { isReserve: true }),
    ];
    expect(planSkip(items, 'a')?.replacement?.videoId).toBe('r1');
  });

  it('has no replacement when the reserve is used up', () => {
    const items = [item('a', 0), item('r1', 1, { isReserve: true, status: 'skipped' })];
    expect(planSkip(items, 'a')).toEqual({ skipped: items[0], replacement: null });
  });

  it('skips a watched video too', () => {
    const items = [item('a', 0, { status: 'watched' }), item('r1', 1, { isReserve: true })];
    expect(planSkip(items, 'a')?.replacement?.videoId).toBe('r1');
  });

  it('returns null for an unknown, reserve or already skipped video', () => {
    expect(planSkip(list, 'zzz')).toBeNull();
    expect(planSkip(list, 'r1')).toBeNull();
    expect(planSkip([item('a', 0, { status: 'skipped' })], 'a')).toBeNull();
  });
});

describe('applySkip', () => {
  it('puts the replacement in the skipped video’s place in the feed', () => {
    const plan = planSkip(list, 'b');
    if (!plan) throw new Error('expected a plan');
    const after = applySkip(list, plan);
    expect(feedVideos(after).map((v) => v.videoId)).toEqual(['a', 'r1', 'c']);
  });

  it('swaps positions and reserve flags and marks the video skipped', () => {
    const plan = planSkip(list, 'b');
    if (!plan) throw new Error('expected a plan');
    const after = applySkip(list, plan);
    expect(after.find((v) => v.videoId === 'b')).toMatchObject({
      position: 3,
      isReserve: true,
      status: 'skipped',
    });
    expect(after.find((v) => v.videoId === 'r1')).toMatchObject({
      position: 1,
      isReserve: false,
      status: 'unseen',
    });
  });

  it('keeps positions unique', () => {
    const plan = planSkip(list, 'a');
    if (!plan) throw new Error('expected a plan');
    const positions = applySkip(list, plan).map((v) => v.position);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('removes the video from the feed when there is no replacement', () => {
    const items = [item('a', 0), item('b', 1)];
    const after = applySkip(items, { skipped: items[0], replacement: null });
    expect(feedVideos(after).map((v) => v.videoId)).toEqual(['b']);
  });

  it('uses the next reserve video on a second skip', () => {
    const first = planSkip(list, 'a');
    if (!first) throw new Error('expected a plan');
    const once = applySkip(list, first);
    const second = planSkip(once, 'c');
    expect(second?.replacement?.videoId).toBe('r2');
  });

  it("doesn't change the list it was given", () => {
    const copy = structuredClone(list);
    const plan = planSkip(list, 'b');
    if (!plan) throw new Error('expected a plan');
    applySkip(list, plan);
    expect(list).toEqual(copy);
  });
});

describe('formatSkipLine', () => {
  it('names the replacement, or says the reserve is used up', () => {
    expect(formatSkipLine({ skipped: list[1], replacement: list[3] }, 'video_not_found')).toBe(
      '[skip] b (video_not_found): replaced by r1',
    );
    expect(formatSkipLine({ skipped: list[1], replacement: null }, 'embed_not_allowed')).toBe(
      '[skip] b (embed_not_allowed): no reserve left, removed from the list',
    );
  });
});
