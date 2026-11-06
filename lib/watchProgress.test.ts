import type { FeedItem, FeedStatus } from './records';
import {
  EMPTY_CLOCK,
  formatWatchedLine,
  markItemWatched,
  msUntilWatched,
  playedMsOf,
  startPlaying,
  stopPlaying,
  watchThresholdMs,
} from './watchProgress';

function item(videoId: string, status: FeedStatus = 'unseen'): FeedItem {
  return {
    position: 0,
    videoId,
    channelId: 'UC123',
    channelTitle: 'Channel',
    title: 'Title',
    durationSec: 60,
    isReserve: false,
    status,
  };
}

describe('watchThresholdMs', () => {
  it('is half the length, in ms', () => {
    expect(watchThresholdMs(60)).toBe(30_000);
    expect(watchThresholdMs(45)).toBe(22_500);
  });

  it('is 0 for a zero, negative or unknown length', () => {
    expect(watchThresholdMs(0)).toBe(0);
    expect(watchThresholdMs(-5)).toBe(0);
    expect(watchThresholdMs(Number.NaN)).toBe(0);
  });
});

describe('play clock', () => {
  it('counts nothing for a video that never played', () => {
    expect(playedMsOf(EMPTY_CLOCK, 'a', 1000)).toBe(0);
  });

  it('counts the current run', () => {
    const clock = startPlaying(EMPTY_CLOCK, 'a', 1000);
    expect(playedMsOf(clock, 'a', 4000)).toBe(3000);
  });

  it('adds up runs and leaves out paused time', () => {
    let clock = startPlaying(EMPTY_CLOCK, 'a', 0);
    clock = stopPlaying(clock, 'a', 2000);
    clock = startPlaying(clock, 'a', 10_000);
    expect(playedMsOf(clock, 'a', 13_000)).toBe(5000);
  });

  it('stops counting a video when another starts', () => {
    let clock = startPlaying(EMPTY_CLOCK, 'a', 0);
    clock = startPlaying(clock, 'b', 2000);
    expect(playedMsOf(clock, 'a', 9000)).toBe(2000);
    expect(playedMsOf(clock, 'b', 9000)).toBe(7000);
  });

  it('ignores a repeated "playing" report', () => {
    let clock = startPlaying(EMPTY_CLOCK, 'a', 0);
    clock = startPlaying(clock, 'a', 5000);
    expect(playedMsOf(clock, 'a', 6000)).toBe(6000);
  });

  it('ignores a "stopped" report from a video that is not playing', () => {
    let clock = startPlaying(EMPTY_CLOCK, 'a', 0);
    clock = stopPlaying(clock, 'b', 1000);
    expect(clock.active?.videoId).toBe('a');
    expect(stopPlaying(EMPTY_CLOCK, 'a', 1000)).toBe(EMPTY_CLOCK);
  });

  it('does not change the clock it was given', () => {
    const clock = startPlaying(EMPTY_CLOCK, 'a', 0);
    stopPlaying(clock, 'a', 1000);
    expect(clock.active).toEqual({ videoId: 'a', sinceMs: 0 });
    expect(EMPTY_CLOCK.playedMs.size).toBe(0);
  });
});

describe('msUntilWatched', () => {
  it('is null when nothing plays', () => {
    expect(msUntilWatched(EMPTY_CLOCK, 0, 60)).toBeNull();
  });

  it('is the time left until half the video has played', () => {
    const clock = startPlaying(EMPTY_CLOCK, 'a', 0);
    expect(msUntilWatched(clock, 10_000, 60)).toBe(20_000);
  });

  it('counts earlier runs', () => {
    let clock = startPlaying(EMPTY_CLOCK, 'a', 0);
    clock = stopPlaying(clock, 'a', 25_000);
    clock = startPlaying(clock, 'a', 100_000);
    expect(msUntilWatched(clock, 100_000, 60)).toBe(5000);
  });

  it('is 0 once half has played', () => {
    const clock = startPlaying(EMPTY_CLOCK, 'a', 0);
    expect(msUntilWatched(clock, 40_000, 60)).toBe(0);
  });
});

describe('markItemWatched', () => {
  it('marks an unseen video watched', () => {
    const items = markItemWatched([item('a'), item('b')], 'b');
    expect(items.map((i) => i.status)).toEqual(['unseen', 'watched']);
  });

  it('leaves a skipped video skipped', () => {
    expect(markItemWatched([item('a', 'skipped')], 'a')[0].status).toBe('skipped');
  });

  it('leaves the list alone for an unknown video', () => {
    expect(markItemWatched([item('a')], 'x')).toEqual([item('a')]);
  });
});

describe('formatWatchedLine', () => {
  it('shows the time played and the length', () => {
    expect(formatWatchedLine('abc', 30_012, 60)).toBe('[watched] abc: 30.0 s of 60 s played');
  });
});
