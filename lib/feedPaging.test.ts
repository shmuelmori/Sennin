import { fitAspect, pageIndexFromOffset, SHORT_ASPECT, shouldMountPlayer } from './feedPaging';

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

describe('shouldMountPlayer', () => {
  it('mounts the current item and its direct neighbors', () => {
    expect(shouldMountPlayer(4, 4)).toBe(true);
    expect(shouldMountPlayer(3, 4)).toBe(true);
    expect(shouldMountPlayer(5, 4)).toBe(true);
  });

  it('does not mount items further away', () => {
    expect(shouldMountPlayer(2, 4)).toBe(false);
    expect(shouldMountPlayer(6, 4)).toBe(false);
    expect(shouldMountPlayer(14, 0)).toBe(false);
  });

  it('accepts a wider neighbor window', () => {
    expect(shouldMountPlayer(6, 4, 2)).toBe(true);
    expect(shouldMountPlayer(7, 4, 2)).toBe(false);
  });

  it('mounts only the current item with no neighbors', () => {
    expect(shouldMountPlayer(4, 4, 0)).toBe(true);
    expect(shouldMountPlayer(5, 4, 0)).toBe(false);
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
