import { PaymentMethod } from '@/types/game';
import { getPaymentMethodMeta } from '@/constants/PaymentMethods';

export function isDeepLinkable(method: PaymentMethod): boolean {
  return getPaymentMethodMeta(method).deepLinkable;
}

/** Canonical affix for a method's handle ('@', '$', 'paypal.me/'), or '' if none. */
export function getAffix(method: PaymentMethod): string {
  return getPaymentMethodMeta(method).affix;
}

/**
 * Bare handle for storage/comparison: strips a leading affix (case-insensitive)
 * and trims. Idempotent — already-bare input is returned unchanged, and a
 * non-affix method (zelle/applecash/other/cash) never has its '@' stripped.
 */
export function normalizeHandle(method: PaymentMethod, raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  const affix = getAffix(method);
  if (affix && trimmed.toLowerCase().startsWith(affix.toLowerCase())) {
    return trimmed.slice(affix.length).trim();
  }
  return trimmed;
}

/** Display/copy string: the affix followed by the bare handle (no double-prefix). */
export function formatHandleForDisplay(method: PaymentMethod, handle: string | undefined): string {
  return getAffix(method) + normalizeHandle(method, handle);
}

/**
 * Prefilled payment URI for the supported apps, or null when the method is not
 * deep-linkable or the handle is empty. `amount` is in the game's currency; note
 * that Venmo/PayPal interpret the amount in the account's own currency (approximate
 * for non-USD — a known limitation).
 */
export function buildPaymentUri(
  method: PaymentMethod,
  handle: string | undefined,
  amount: number,
  note: string,
): string | null {
  const h = (handle ?? '').trim();
  if (!h) return null;

  // Two-decimal string so the deep-linked amount matches what the UI displays
  // (e.g. "10.10", not "10.1") and is robust against float precision residue.
  const amt = amount.toFixed(2);
  switch (method) {
    case 'venmo': {
      const r = h.replace(/^@/, '');
      const base = `venmo://paycharge?txn=pay&recipients=${r}&amount=${amt}`;
      // Omit the note param entirely when empty — a trailing `&note=` is noise,
      // and Cash Cage no longer sends a memo (a poker-related note risks the
      // recipient's account under Venmo's TOS on gambling payments).
      const memo = note.trim();
      return memo ? `${base}&note=${encodeURIComponent(memo)}` : base;
    }
    case 'cashapp': {
      const tag = h.replace(/^\$/, '');
      return `https://cash.app/$${tag}/${amt}`;
    }
    case 'paypal': {
      const user = h.replace(/^@/, '').replace(/^paypal\.me\//i, '');
      return `https://paypal.me/${user}/${amt}`;
    }
    default:
      return null;
  }
}
