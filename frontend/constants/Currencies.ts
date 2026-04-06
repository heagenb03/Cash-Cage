export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR' | 'BRL' | 'MXN' | 'CHF';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: 0 | 2;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: 'USD', symbol: '$',  name: 'US Dollar',          decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€',  name: 'Euro',               decimals: 2, locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£',  name: 'British Pound',      decimals: 2, locale: 'en-GB' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar',   decimals: 2, locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar',  decimals: 2, locale: 'en-AU' },
  JPY: { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',       decimals: 0, locale: 'ja-JP' },
  INR: { code: 'INR', symbol: '₹',  name: 'Indian Rupee',       decimals: 2, locale: 'en-IN' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real',     decimals: 2, locale: 'pt-BR' },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',     decimals: 2, locale: 'es-MX' },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc',        decimals: 2, locale: 'de-CH' },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';
