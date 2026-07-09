import {
  computeCardLift,
  KEYBOARD_LIFT_MARGIN,
  CARD_TOP_INSET,
} from '@/utils/keyboardLift';

describe('computeCardLift', () => {
  const OVERLAY = 800;

  it('does not lift when the keyboard is closed', () => {
    expect(computeCardLift(0, OVERLAY, 300)).toBe(0);
  });

  it('does not lift a short card the keyboard never reaches', () => {
    // gapBelow = (800-200)/2 = 300; needed = 250-300+12 < 0
    expect(computeCardLift(250, OVERLAY, 200)).toBe(0);
  });

  it('lifts by exactly the overlap plus margin when the keyboard covers the card', () => {
    // gapBelow = (800-400)/2 = 200; needed = 336-200+12 = 148; maxLift = 176
    expect(computeCardLift(336, OVERLAY, 400)).toBe(148);
  });

  it('clamps the lift for a tall card so the top does not clip off-screen', () => {
    // gapBelow = (800-700)/2 = 50; needed = 336-50+12 = 298; maxLift = max(0,50-24)=26
    expect(computeCardLift(336, OVERLAY, 700)).toBe(26);
  });

  it('returns 0 before layout has measured the heights', () => {
    expect(computeCardLift(300, 0, 0)).toBe(0);
  });

  it('honors custom margin and topInset overrides', () => {
    // gapBelow = (800-400)/2 = 200; needed = 336-200+0 = 136; maxLift = max(0,200-0)=200
    expect(computeCardLift(336, OVERLAY, 400, 0, 0)).toBe(136);
  });

  it('exposes the spec constants', () => {
    expect(KEYBOARD_LIFT_MARGIN).toBe(12);
    expect(CARD_TOP_INSET).toBe(24);
  });
});
