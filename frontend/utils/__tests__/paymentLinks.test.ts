import { buildPaymentUri, isDeepLinkable } from '@/utils/paymentLinks';
import { getPaymentMethodMeta } from '@/constants/PaymentMethods';

describe('isDeepLinkable', () => {
  it('is true only for venmo/cashapp/paypal', () => {
    expect(isDeepLinkable('venmo')).toBe(true);
    expect(isDeepLinkable('cashapp')).toBe(true);
    expect(isDeepLinkable('paypal')).toBe(true);
    expect(isDeepLinkable('applecash')).toBe(false);
    expect(isDeepLinkable('zelle')).toBe(false);
    expect(isDeepLinkable('cash')).toBe(false);
    expect(isDeepLinkable('other')).toBe(false);
  });
});

describe('buildPaymentUri', () => {
  it('builds a Venmo pay URI, stripping a leading @', () => {
    expect(buildPaymentUri('venmo', '@alice', 50, 'Poker')).toBe(
      'venmo://paycharge?txn=pay&recipients=alice&amount=50.00&note=Poker',
    );
  });
  it('builds a Cash App URI, stripping a leading $', () => {
    expect(buildPaymentUri('cashapp', '$alice', 50, 'Poker')).toBe(
      'https://cash.app/$alice/50.00',
    );
  });
  it('builds a PayPal.me URI', () => {
    expect(buildPaymentUri('paypal', 'alice', 50, 'Poker')).toBe(
      'https://paypal.me/alice/50.00',
    );
  });
  it('returns null for non-linkable methods or empty handle', () => {
    expect(buildPaymentUri('applecash', 'alice', 50, 'Poker')).toBeNull();
    expect(buildPaymentUri('venmo', '', 50, 'Poker')).toBeNull();
    expect(buildPaymentUri('venmo', undefined, 50, 'Poker')).toBeNull();
  });
});

describe('getPaymentMethodMeta', () => {
  it('returns a label for each method', () => {
    expect(getPaymentMethodMeta('cashapp').label).toBe('Cash App');
    expect(getPaymentMethodMeta('applecash').deepLinkable).toBe(false);
  });
});
