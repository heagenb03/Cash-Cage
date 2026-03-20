import { getNetBalanceColor, formatNetBalanceDisplay } from '../formatUtils';

describe('getNetBalanceColor', () => {
  it('returns green (#4CAF50) for positive balance', () => {
    expect(getNetBalanceColor(100)).toBe('#4CAF50');
  });

  it('returns red (#C04657) for negative balance', () => {
    expect(getNetBalanceColor(-50)).toBe('#C04657');
  });

  it('returns green (#4CAF50) for zero balance', () => {
    expect(getNetBalanceColor(0)).toBe('#4CAF50');
  });

  it('returns green for small positive value', () => {
    expect(getNetBalanceColor(0.01)).toBe('#4CAF50');
  });

  it('returns red for small negative value', () => {
    expect(getNetBalanceColor(-0.01)).toBe('#C04657');
  });
});

describe('formatNetBalanceDisplay', () => {
  it('formats positive balance with +$ prefix', () => {
    expect(formatNetBalanceDisplay(125)).toBe('+$125');
  });

  it('formats negative balance with -$ prefix', () => {
    expect(formatNetBalanceDisplay(-50)).toBe('-$50');
  });

  it('formats zero as $0', () => {
    expect(formatNetBalanceDisplay(0)).toBe('$0');
  });

  it('formats positive thousands with k suffix', () => {
    expect(formatNetBalanceDisplay(1500)).toBe('+$1.5k');
  });

  it('formats negative thousands with k suffix', () => {
    expect(formatNetBalanceDisplay(-2000)).toBe('-$2.0k');
  });

  it('formats exactly $1000 with k suffix', () => {
    expect(formatNetBalanceDisplay(1000)).toBe('+$1.0k');
  });

  it('formats $999 without k suffix', () => {
    expect(formatNetBalanceDisplay(999)).toBe('+$999');
  });

  it('rounds sub-dollar amounts to integer', () => {
    expect(formatNetBalanceDisplay(50.75)).toBe('+$51');
  });

  it('formats large amounts correctly', () => {
    expect(formatNetBalanceDisplay(10000)).toBe('+$10.0k');
  });

  it('formats negative large amounts correctly', () => {
    expect(formatNetBalanceDisplay(-5500)).toBe('-$5.5k');
  });
});
