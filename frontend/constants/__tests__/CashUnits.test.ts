import {
  EXACT_CASH_UNIT,
  DEFAULT_CASH_UNIT,
  getCashUnitOptions,
  getDefaultCashUnit,
  resolveCashUnit,
} from '@/constants/CashUnits';

describe('CashUnits', () => {
  it('exposes Exact=0 and default=5', () => {
    expect(EXACT_CASH_UNIT).toBe(0);
    expect(DEFAULT_CASH_UNIT).toBe(5);
  });

  it('USD options lead with Exact then 1 then note presets, no $25', () => {
    const opts = getCashUnitOptions('USD');
    expect(opts[0]).toBe(0);
    expect(opts).toContain(1);
    expect(opts).toEqual(expect.arrayContaining([5, 10, 20, 50]));
    expect(opts).not.toContain(25);
  });

  it('JPY uses yen note presets, not 5/10', () => {
    const opts = getCashUnitOptions('JPY');
    expect(opts).toEqual(expect.arrayContaining([1000, 5000, 10000]));
    expect(opts).not.toContain(5);
  });

  it('has no duplicate values and is ascending after Exact', () => {
    const opts = getCashUnitOptions('MXN');
    const rest = opts.slice(1);
    expect(new Set(opts).size).toBe(opts.length);
    expect([...rest].sort((a, b) => a - b)).toEqual(rest);
  });
});

describe('getDefaultCashUnit', () => {
  it('is the smallest note preset for the currency', () => {
    expect(getDefaultCashUnit('USD')).toBe(5);
    expect(getDefaultCashUnit('JPY')).toBe(1000);
    expect(getDefaultCashUnit('MXN')).toBe(50);
  });

  it('preserves legacy $5 behavior for USD', () => {
    expect(getDefaultCashUnit('USD')).toBe(DEFAULT_CASH_UNIT);
  });
});

describe('resolveCashUnit', () => {
  it('keeps a unit that is valid for the currency', () => {
    expect(resolveCashUnit(20, 'USD')).toBe(20);
    expect(resolveCashUnit(5000, 'JPY')).toBe(5000);
  });

  it('keeps Exact (0) and 1 under every currency', () => {
    expect(resolveCashUnit(EXACT_CASH_UNIT, 'JPY')).toBe(EXACT_CASH_UNIT);
    expect(resolveCashUnit(EXACT_CASH_UNIT, 'USD')).toBe(EXACT_CASH_UNIT);
    expect(resolveCashUnit(1, 'JPY')).toBe(1);
    expect(resolveCashUnit(1, 'USD')).toBe(1);
  });

  it('falls back to the currency default when the unit is not a valid option', () => {
    // A $5 unit chosen under USD is meaningless after switching to JPY
    expect(resolveCashUnit(5, 'JPY')).toBe(1000);
    expect(resolveCashUnit(1000, 'USD')).toBe(5);
  });

  it('falls back to the currency default when the unit is undefined', () => {
    expect(resolveCashUnit(undefined, 'USD')).toBe(5);
    expect(resolveCashUnit(undefined, 'JPY')).toBe(1000);
  });
});
