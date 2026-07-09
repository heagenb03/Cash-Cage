/** Gap kept between the card's bottom edge and the top of the keyboard. */
export const KEYBOARD_LIFT_MARGIN = 12;

/** Minimum gap preserved above the card so a tall card's title never clips. */
export const CARD_TOP_INSET = 24;

/**
 * How far (px, >= 0) a vertically-centered modal card must translate UP so its
 * bottom edge clears the keyboard — rising only as much as it needs to.
 *
 * A centered card has `(overlayHeight - cardHeight) / 2` of empty space below
 * it. It must rise by `keyboardHeight - gapBelow + margin`, clamped so it never
 * goes negative and never lifts so far the top clips past `topInset`. Heights of
 * 0 (pre-layout) yield 0, so the card starts centered.
 *
 * Pure and side-effect free with a `'worklet'` directive: runs on the Reanimated
 * UI thread AND is unit-testable on the JS thread. Must not import reanimated.
 */
export function computeCardLift(
  keyboardHeight: number,
  overlayHeight: number,
  cardHeight: number,
  margin: number = KEYBOARD_LIFT_MARGIN,
  topInset: number = CARD_TOP_INSET,
): number {
  'worklet';
  const gapBelow = (overlayHeight - cardHeight) / 2;
  const needed = keyboardHeight - gapBelow + margin;
  const maxLift = Math.max(0, gapBelow - topInset);
  return Math.min(Math.max(needed, 0), maxLift);
}
