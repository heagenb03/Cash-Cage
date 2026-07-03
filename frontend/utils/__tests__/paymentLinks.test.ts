import {
  buildPaymentUri,
  isDeepLinkable,
  getAffix,
  normalizeHandle,
  formatHandleForDisplay,
} from '@/utils/paymentLinks';
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

describe('getAffix', () => {
  it('returns the canonical affix per method', () => {
    expect(getAffix('venmo')).toBe('@');
    expect(getAffix('cashapp')).toBe('$');
    expect(getAffix('paypal')).toBe('paypal.me/');
    expect(getAffix('zelle')).toBe('');
    expect(getAffix('cash')).toBe('');
    expect(getAffix('other')).toBe('');
  });
});

describe('normalizeHandle', () => {
  it('strips a leading affix and trims', () => {
    expect(normalizeHandle('venmo', '@heagen')).toBe('heagen');
    expect(normalizeHandle('venmo', '  @heagen ')).toBe('heagen');
    expect(normalizeHandle('cashapp', '$tag')).toBe('tag');
    expect(normalizeHandle('paypal', 'paypal.me/heagen')).toBe('heagen');
  });
  it('leaves an already-bare handle unchanged', () => {
    expect(normalizeHandle('venmo', 'heagen')).toBe('heagen');
  });
  it('does not treat a non-affix method\'s @ as an affix', () => {
    expect(normalizeHandle('zelle', 'a@b.com')).toBe('a@b.com');
    expect(normalizeHandle('other', 'catch me next week')).toBe('catch me next week');
  });
  it('returns empty string for empty/undefined input', () => {
    expect(normalizeHandle('venmo', '')).toBe('');
    expect(normalizeHandle('venmo', undefined)).toBe('');
  });
});

describe('formatHandleForDisplay', () => {
  it('prepends the affix to a bare handle', () => {
    expect(formatHandleForDisplay('venmo', 'heagen')).toBe('@heagen');
    expect(formatHandleForDisplay('cashapp', 'tag')).toBe('$tag');
    expect(formatHandleForDisplay('paypal', 'heagen')).toBe('paypal.me/heagen');
  });
  it('does not double-prefix legacy data that already has the affix', () => {
    expect(formatHandleForDisplay('venmo', '@heagen')).toBe('@heagen');
    expect(formatHandleForDisplay('cashapp', '$tag')).toBe('$tag');
  });
  it('returns non-affix handles unchanged', () => {
    expect(formatHandleForDisplay('zelle', 'a@b.com')).toBe('a@b.com');
    expect(formatHandleForDisplay('other', 'Splitwise')).toBe('Splitwise');
  });
});
