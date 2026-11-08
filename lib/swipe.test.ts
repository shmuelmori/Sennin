import { dragDistance, isSideways, offsetFor, shouldOpen, SWIPE_START_PX } from './swipe';

const WIDTH = 96;

describe('isSideways', () => {
  it('takes a clear sideways move in either direction', () => {
    expect(isSideways(30, 5)).toBe(true);
    expect(isSideways(-30, 5)).toBe(true);
  });

  it('ignores tiny moves, so taps still reach the topic tags', () => {
    expect(isSideways(SWIPE_START_PX, 0)).toBe(false);
    expect(isSideways(SWIPE_START_PX + 1, 0)).toBe(true);
  });

  it('leaves vertical and diagonal moves to the list scroll', () => {
    expect(isSideways(5, 40)).toBe(false);
    expect(isSideways(30, 20)).toBe(false);
  });
});

describe('dragDistance', () => {
  it('opens when dragging toward the button side (left-to-right layout)', () => {
    expect(dragDistance(0, -40, -1, WIDTH)).toBe(40);
  });

  it('opens when dragging toward the button side (right-to-left layout)', () => {
    expect(dragDistance(0, 40, 1, WIDTH)).toBe(40);
  });

  it("doesn't go past shut or fully open", () => {
    expect(dragDistance(0, 40, -1, WIDTH)).toBe(0);
    expect(dragDistance(0, -500, -1, WIDTH)).toBe(WIDTH);
  });

  it('continues from an open row', () => {
    expect(dragDistance(WIDTH, 30, -1, WIDTH)).toBe(WIDTH - 30);
  });
});

describe('offsetFor', () => {
  it('moves the row toward the side it opens to', () => {
    expect(offsetFor(40, -1)).toBe(-40);
    expect(offsetFor(40, 1)).toBe(40);
  });
});

describe('shouldOpen', () => {
  it('opens past half the width and shuts below it', () => {
    expect(shouldOpen(WIDTH / 2 + 1, 0, -1, WIDTH)).toBe(true);
    expect(shouldOpen(WIDTH / 2, 0, -1, WIDTH)).toBe(false);
  });

  it('opens on a quick flick toward the button, however short', () => {
    expect(shouldOpen(10, -0.5, -1, WIDTH)).toBe(true);
    expect(shouldOpen(10, 0.5, 1, WIDTH)).toBe(true);
  });

  it('shuts on a quick flick away from the button, however far open', () => {
    expect(shouldOpen(WIDTH - 10, 0.5, -1, WIDTH)).toBe(false);
    expect(shouldOpen(WIDTH - 10, -0.5, 1, WIDTH)).toBe(false);
  });
});
