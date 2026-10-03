import { describe, expect, it } from 'vitest';
import { swipeOutcome } from './swipe';

describe('swiping a notification away', () => {
  it.each([
    [-150, 0, -1, 'far enough to the left'],
    [150, 0, 1, 'far enough to the right'],
    [-40, -900, -1, 'a quick flick to the left'],
    [40, 900, 1, 'a quick flick to the right'],
    [-60, -100, 0, 'a short, slow drag springs back'],
    [30, -900, 0, 'a flick back against the drag springs back'],
    [0, 0, 0, 'a tap is not a swipe'],
  ])('%i px at %i px/s → %i (%s)', (offset, velocity, outcome) => {
    expect(swipeOutcome(offset, velocity)).toBe(outcome);
  });
});
