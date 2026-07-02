import { PaymentMethod } from '@/types/game';

export interface PaymentMethodMeta {
  key: PaymentMethod;
  label: string;
  deepLinkable: boolean;
  handlePlaceholder: string;
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { key: 'cash',      label: 'Cash',       deepLinkable: false, handlePlaceholder: '' },
  { key: 'venmo',     label: 'Venmo',      deepLinkable: true,  handlePlaceholder: '@username' },
  { key: 'cashapp',   label: 'Cash App',   deepLinkable: true,  handlePlaceholder: '$cashtag' },
  { key: 'paypal',    label: 'PayPal',     deepLinkable: true,  handlePlaceholder: 'paypal.me username' },
  { key: 'zelle',     label: 'Zelle',      deepLinkable: false, handlePlaceholder: 'email or phone' },
  { key: 'applecash', label: 'Apple Cash', deepLinkable: false, handlePlaceholder: 'phone or email' },
  { key: 'other',     label: 'Other',      deepLinkable: false, handlePlaceholder: 'note' },
];

export function getPaymentMethodMeta(key: PaymentMethod): PaymentMethodMeta {
  return PAYMENT_METHODS.find(m => m.key === key) ?? PAYMENT_METHODS[PAYMENT_METHODS.length - 1];
}
