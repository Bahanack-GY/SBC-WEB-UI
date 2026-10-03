/** Past this distance (px) or this speed (px/s), a sideways swipe removes the item. */
export const SWIPE_DISTANCE = 100;
export const SWIPE_VELOCITY = 600;

/** -1 / 1: dismiss towards that side. 0: spring back. */
export function swipeOutcome(offsetX: number, velocityX: number): -1 | 0 | 1 {
  if (Math.abs(offsetX) > SWIPE_DISTANCE) return offsetX < 0 ? -1 : 1;
  // A quick flick counts too, as long as it goes the same way as the drag.
  if (Math.abs(velocityX) > SWIPE_VELOCITY && Math.sign(velocityX) === Math.sign(offsetX)) return velocityX < 0 ? -1 : 1;
  return 0;
}
