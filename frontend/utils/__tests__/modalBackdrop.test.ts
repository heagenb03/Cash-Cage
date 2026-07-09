import { backdropPressAction } from '../modalBackdrop';

describe('backdropPressAction', () => {
  it('dismisses only the keyboard when the keyboard is open', () => {
    expect(backdropPressAction(true, true)).toBe('dismiss-keyboard');
  });

  it('dismisses the keyboard even when backdrop dismissal is disabled', () => {
    expect(backdropPressAction(true, false)).toBe('dismiss-keyboard');
  });

  it('closes the modal when the keyboard is closed and dismissal is enabled', () => {
    expect(backdropPressAction(false, true)).toBe('close');
  });

  it('does nothing when the keyboard is closed and dismissal is disabled', () => {
    expect(backdropPressAction(false, false)).toBe('none');
  });
});
