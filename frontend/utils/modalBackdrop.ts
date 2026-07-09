export type BackdropAction = 'dismiss-keyboard' | 'close' | 'none';

/**
 * Decide what a tap on a modal's dim backdrop does.
 * Keyboard open  -> dismiss the keyboard only (never the modal).
 * Keyboard closed -> close the modal, unless dismissOnBackdrop is false
 * (destructive confirms require an explicit button press).
 */
export function backdropPressAction(
  keyboardVisible: boolean,
  dismissOnBackdrop: boolean,
): BackdropAction {
  if (keyboardVisible) return 'dismiss-keyboard';
  return dismissOnBackdrop ? 'close' : 'none';
}
