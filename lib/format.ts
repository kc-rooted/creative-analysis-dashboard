/**
 * Format currency values with appropriate K/M suffix
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "$1.2K" or "$3.4M"
 */
export function formatCurrency(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) {
    return '$0';
  }

  const absValue = Math.abs(value);

  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(decimals)}M`;
  } else if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(decimals)}K`;
  } else {
    return `$${value.toFixed(decimals)}`;
  }
}

/**
 * Format large numbers with appropriate K/M suffix
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "1.2K" or "3.4M"
 */
export function formatNumber(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) {
    return '0';
  }

  const absValue = Math.abs(value);

  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  } else if (absValue >= 1000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  } else {
    return value.toFixed(decimals);
  }
}
