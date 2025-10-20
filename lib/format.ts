/**
 * Format currency values with comma separators, rounded to nearest dollar
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 0, kept for backwards compatibility but ignored)
 * @param currencySymbol - Currency symbol to use (default: '$')
 * @returns Formatted string like "$1,234" or "$1,234,567"
 */
export function formatCurrency(value: number | null | undefined, decimals: number = 0, currencySymbol: string = '$'): string {
  if (value === null || value === undefined) {
    return `${currencySymbol}0`;
  }

  // Round to nearest dollar
  const roundedValue = Math.round(value);

  // Format with comma separators
  const formattedValue = roundedValue.toLocaleString('en-US');

  return `${currencySymbol}${formattedValue}`;
}

/**
 * Format large numbers with comma separators, rounded to nearest whole number
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 0, kept for backwards compatibility but ignored)
 * @returns Formatted string like "1,234" or "1,234,567"
 */
export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined) {
    return '0';
  }

  // Round to nearest whole number
  const roundedValue = Math.round(value);

  // Format with comma separators
  return roundedValue.toLocaleString('en-US');
}
