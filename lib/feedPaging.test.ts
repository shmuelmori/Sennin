import {
  feedPageLayout,
  fitAspect,
  pageIndexFromOffset,
  SHORT_ASPECT,
} from './feedPaging';

describe('pageIndexFromOffset', () => {
  it('returns the page at an exact offset', () => {
    expect(pageIndexFromOffset(0, 800, 15)).toBe(0);
    expect(pageIndexFromOffset(800, 800, 15)).toBe(1);
    expect(pageIndexFromOffset(800 * 14, 800, 15)).toBe(14);
  });

  it('rounds to the nearest page', () => {
    expect(pageIndexFromOffset(800 * 1.4, 800, 15)).toBe(1);
    expect(pageIndexFromOffset(800 * 1.6, 800, 15)).toBe(2);
  });

  it('works with fractional page heights', () => {
    expect(pageIndexFromOffset(781.33 * 3, 781.33, 15)).toBe(3);
  });

  it('clamps to the first and last page', () => {
    expect(pageIndexFromOffset(-300, 800, 15)).toBe(0);
    expect(pageIndexFromOffset(800 * 20, 800, 15)).toBe(14);
  });

  it('returns 0 for an empty list or a bad page height or offset', () => {
    expect(pageIndexFromOffset(1600, 800, 0)).toBe(0);
    expect(pageIndexFromOffset(1600, 0, 15)).toBe(0);
    expect(pageIndexFromOffset(1600, -800, 15)).toBe(0);
    expect(pageIndexFromOffset(Number.NaN, 800, 15)).toBe(0);
    expect(pageIndexFromOffset(1600, Number.NaN, 15)).toBe(0);
  });
});

describe('fitAspect', () => {
  it('fills the width when the container is taller than 9:16', () => {
    const size = fitAspect({ width: 412, height: 800 }, SHORT_ASPECT);
    expect(size.width).toBe(412);
    expect(size.height).toBeCloseTo((412 * 16) / 9);
  });

  it('fills the height when the container is wider than 9:16', () => {
    expect(fitAspect({ width: 412, height: 600 }, SHORT_ASPECT)).toEqual({
      width: 337.5,
      height: 600,
    });
  });

  it('fills both sides when the container is exactly 9:16', () => {
    expect(fitAspect({ width: 360, height: 640 }, SHORT_ASPECT)).toEqual({
      width: 360,
      height: 640,
    });
  });

  it('returns zero size for an empty container or aspect', () => {
    expect(fitAspect({ width: 0, height: 800 }, SHORT_ASPECT)).toEqual({ width: 0, height: 0 });
    expect(fitAspect({ width: 412, height: 0 }, SHORT_ASPECT)).toEqual({ width: 0, height: 0 });
    expect(fitAspect({ width: 412, height: 800 }, { width: 0, height: 16 })).toEqual({
      width: 0,
      height: 0,
    });
  });
});

describe('feedPageLayout', () => {
  it('gives the strip its minimum and the player the rest, when the player is limited by height', () => {
    const layout = feedPageLayout({ width: 412, height: 800 }, 100);
    expect(layout.player).toEqual({ width: (700 * 9) / 16, height: 700 });
    expect(layout.infoHeight).toBe(100);
  });

  it('gives the strip the height left over when the player is limited by width', () => {
    const layout = feedPageLayout({ width: 360, height: 800 }, 100);
    expect(layout.player).toEqual({ width: 360, height: 640 });
    expect(layout.infoHeight).toBe(160);
  });

  it('always adds up to the page height', () => {
    for (const minInfo of [0, 50, 84, 120]) {
      const layout = feedPageLayout({ width: 411.4, height: 781.3 }, minInfo);
      expect(layout.player.height + layout.infoHeight).toBeCloseTo(781.3);
      expect(layout.infoHeight).toBeGreaterThanOrEqual(minInfo);
    }
  });

  it('treats a negative or bad minimum as no minimum', () => {
    const full = { width: 360, height: 640 };
    expect(feedPageLayout(full, -20)).toEqual({ player: full, infoHeight: 0 });
    expect(feedPageLayout(full, Number.NaN)).toEqual({ player: full, infoHeight: 0 });
  });

  it('gives the whole page to the strip when there is no room for a player', () => {
    expect(feedPageLayout({ width: 412, height: 80 }, 100)).toEqual({
      player: { width: 0, height: 0 },
      infoHeight: 80,
    });
  });
});
