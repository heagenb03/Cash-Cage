import { PaymentMethod } from '@/types/game';
import { getPaymentMethodMeta } from '@/constants/PaymentMethods';

export function isDeepLinkable(method: PaymentMethod): boolean {
  return getPaymentMethodMeta(method).deepLinkable;
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
      return `venmo://paycharge?txn=pay&recipients=${r}&amount=${amt}&note=${encodeURIComponent(note)}`;
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
