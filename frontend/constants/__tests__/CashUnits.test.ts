import { EXACT_CASH_UNIT, DEFAULT_CASH_UNIT, getCashUnitOptions } from '@/constants/CashUnits';

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
