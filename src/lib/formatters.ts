/**
 * Formats a number to be more readable (e.g., 2300 → 2.3K, 6700000 → 6.7M)
 * @param value The number to format
 * @returns Formatted string with appropriate suffix (K, M, B, T)
 */
export function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (value === 0) {
    return '0';
  }

  const absValue = Math.abs(value);

  if (absValue < 1000) {
    return value.toString();
  } else if (absValue < 1000000) {
    return `${(value / 1000).toFixed(1)}K`;
  } else if (absValue < 1000000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (absValue < 1000000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else {
    return `${(value / 1000000000000).toFixed(1)}T`;
  }
}

/**
 * Formats a number as currency (USD by default)
 * @param value The number to format as currency
 * @param currency The currency code (default: 'USD')
 * @param locale The locale to use for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | undefined,
  currency: string = 'USD',
  locale: string = 'en-US',
): string {
  if (value === undefined || value === null) {
    return '';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
