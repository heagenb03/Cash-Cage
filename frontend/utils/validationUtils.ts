/**
 * Validates that a string contains only valid numeric characters
 * Accepts: "50", "50.5", "100.00"
 * Rejects: "99a99", "50.5abc", "abc50", "50..5", "50.5.5"
 */
export function isValidNumericInput(input: string): boolean {
  // Trim whitespace
  const trimmed = input.trim();

  // Empty string is invalid (but caller should handle separately)
  if (trimmed === '') return false;

  // Regex: optional digits, optional single decimal point followed by digits
  // ^$ ensures entire string matches (no trailing garbage)
  const numericPattern = /^\d+\.?\d*$/;

  return numericPattern.test(trimmed);
}
