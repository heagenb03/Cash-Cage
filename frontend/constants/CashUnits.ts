import { CurrencyCode } from '@/constants/Currencies';

/** Exact = no rounding (cent-precise). */
export const EXACT_CASH_UNIT = 0;
/** Preserves current app behavior when a game has no explicit unit. */
export const DEFAULT_CASH_UNIT = 5;

// Real note denominations per currency (coarser than the universal Exact / 1).
const NOTE_PRESETS: Record<CurrencyCode, number[]> = {
  USD: [5, 10, 20, 50],
  CAD: [5, 10, 20, 50],
  AUD: [5, 10, 20, 50],
  EUR: [5, 10, 20, 50],
  GBP: [5, 10, 20, 50],
  CHF: [10, 20, 50, 100],
  MXN: [50, 100, 200, 500],
  BRL: [10, 20, 50, 100],
  INR: [50, 100, 200, 500],
  JPY: [1000, 5000, 10000],
};

/**
 * Ordered options for the cash-unit picker:
 * [Exact(0), 1, ...currency note presets]. `1` is omitted when the currency's
 * smallest note preset is already <= 1 (never happens today, but future-proof).
 */
export function getCashUnitOptions(currency: CurrencyCode): number[] {
  const notes = NOTE_PRESETS[currency] ?? NOTE_PRESETS.USD;
  const universal = notes[0] > 1 ? [1] : [];
  return [EXACT_CASH_UNIT, ...universal, ...notes];
}

/** Default rounding unit for a currency: its smallest note preset ($5, ¥1000, …). */
export function getDefaultCashUnit(currency: CurrencyCode): number {
  const notes = NOTE_PRESETS[currency] ?? NOTE_PRESETS.USD;
  return notes[0];
}

/**
 * Resolve a stored cash unit against the current currency. A unit picked under
 * one currency (e.g. $5) is meaningless in another (JPY has no ¥5 note), so
 * anything that isn't a valid option for `currency` falls back to that
 * currency's default. Exact (0) and 1 are valid everywhere.
 */
export function resolveCashUnit(unit: number | undefined, currency: CurrencyCode): number {
  if (unit !== undefined && getCashUnitOptions(currency).includes(unit)) {
    return unit;
  }
  return getDefaultCashUnit(currency);
}
