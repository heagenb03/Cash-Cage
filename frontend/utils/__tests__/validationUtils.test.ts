import { isValidNumericInput } from '../validationUtils';

describe('isValidNumericInput', () => {
  // Valid inputs
  it('accepts a simple integer', () => {
    expect(isValidNumericInput('50')).toBe(true);
  });

  it('accepts a decimal number', () => {
    expect(isValidNumericInput('50.5')).toBe(true);
  });

  it('accepts a number with two decimal places', () => {
    expect(isValidNumericInput('100.00')).toBe(true);
  });

  it('accepts a large integer', () => {
    expect(isValidNumericInput('999999')).toBe(true);
  });

  it('accepts a number with trailing decimal point', () => {
    expect(isValidNumericInput('50.')).toBe(true);
  });

  it('accepts input with leading/trailing whitespace', () => {
    expect(isValidNumericInput('  42  ')).toBe(true);
  });

  it('accepts zero', () => {
    expect(isValidNumericInput('0')).toBe(true);
  });

  // Invalid inputs
  it('rejects empty string', () => {
    expect(isValidNumericInput('')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidNumericInput('   ')).toBe(false);
  });

  it('rejects letters mixed with numbers', () => {
    expect(isValidNumericInput('99a99')).toBe(false);
  });

  it('rejects trailing letters after decimal', () => {
    expect(isValidNumericInput('50.5abc')).toBe(false);
  });

  it('rejects leading letters', () => {
    expect(isValidNumericInput('abc50')).toBe(false);
  });

  it('rejects multiple decimal points', () => {
    expect(isValidNumericInput('50..5')).toBe(false);
  });

  it('rejects three-part decimal', () => {
    expect(isValidNumericInput('50.5.5')).toBe(false);
  });

  it('rejects negative numbers', () => {
    expect(isValidNumericInput('-10')).toBe(false);
  });

  it('rejects special characters', () => {
    expect(isValidNumericInput('$50')).toBe(false);
    expect(isValidNumericInput('50%')).toBe(false);
    expect(isValidNumericInput('1,000')).toBe(false);
  });

  it('rejects purely alphabetic input', () => {
    expect(isValidNumericInput('abc')).toBe(false);
  });

  it('rejects a lone decimal point', () => {
    expect(isValidNumericInput('.')).toBe(false);
  });
});
