import { PAYMENT_METHODS, getPaymentMethodMeta } from '@/constants/PaymentMethods';

describe('PAYMENT_METHODS meta', () => {
  it('marks only cash as not taking a handle', () => {
    const noHandle = PAYMENT_METHODS.filter(m => !m.takesHandle).map(m => m.key);
    expect(noHandle).toEqual(['cash']);
  });

  it('assigns affixes only to the deep-linkable methods', () => {
    expect(getPaymentMethodMeta('venmo').affix).toBe('@');
    expect(getPaymentMethodMeta('cashapp').affix).toBe('$');
    expect(getPaymentMethodMeta('paypal').affix).toBe('paypal.me/');
    expect(getPaymentMethodMeta('zelle').affix).toBe('');
    expect(getPaymentMethodMeta('applecash').affix).toBe('');
    expect(getPaymentMethodMeta('cash').affix).toBe('');
    expect(getPaymentMethodMeta('other').affix).toBe('');
  });

  it('uses bare placeholders (no leading symbol) for affixed methods', () => {
    expect(getPaymentMethodMeta('venmo').handlePlaceholder).toBe('username');
    expect(getPaymentMethodMeta('cashapp').handlePlaceholder).toBe('cashtag');
    expect(getPaymentMethodMeta('paypal').handlePlaceholder).toBe('username');
  });
});
