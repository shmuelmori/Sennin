import { SPIKE_SHORTS } from './spikeShorts';

describe('SPIKE_SHORTS', () => {
  it('has 15 Shorts, like a real feed', () => {
    expect(SPIKE_SHORTS).toHaveLength(15);
  });

  it('has no duplicate video IDs', () => {
    const ids = SPIKE_SHORTS.map((short) => short.videoId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses well-formed 11-character video IDs', () => {
    for (const short of SPIKE_SHORTS) {
      expect(short.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
    }
  });
});
