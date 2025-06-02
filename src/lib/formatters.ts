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

export const formatTimestamp = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString();

/**
 * Convert UTC hour string to user's local date
 * @param utcHour UTC hour string in format "2025-06-02 14:00:00"
 * @param userTimezone User's timezone (defaults to browser timezone)
 * @returns Local date string in YYYY-MM-DD format
 */
export const convertUTCHourToLocalDate = (
  utcHour: string,
  userTimezone?: string,
): string => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // On server, just return the UTC date part to avoid hydration mismatch
    return utcHour.split(' ')[0] || '';
  }

  try {
    // Parse UTC hour string - handle different formats
    let utcDate: Date;

    if (utcHour.includes('T')) {
      // ISO format: "2025-06-02T14:00:00"
      utcDate = new Date(utcHour + 'Z');
    } else if (utcHour.includes(' ')) {
      // Space format: "2025-06-02 14:00:00"
      utcDate = new Date(utcHour.replace(' ', 'T') + 'Z');
    } else {
      // Just date: "2025-06-02"
      utcDate = new Date(utcHour + 'T00:00:00Z');
    }

    // Validate the date
    if (isNaN(utcDate.getTime())) {
      console.warn('Invalid UTC hour format:', utcHour);
      return utcHour.split(' ')[0] || utcHour.split('T')[0] || '';
    }

    // Get user's timezone (default to browser timezone)
    const timezone =
      userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert to user's local timezone and get the date part
    const localDateString = utcDate.toLocaleDateString('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return localDateString;
  } catch (error) {
    console.warn('Error converting UTC hour to local date:', error, utcHour);
    // Fallback: return the date part of the input
    return utcHour.split(' ')[0] || utcHour.split('T')[0] || '';
  }
};

/**
 * Get user's current timezone
 * @returns User's timezone string (e.g., "America/New_York")
 */
export const getUserTimezone = (): string => {
  if (typeof window === 'undefined') {
    return 'UTC'; // Default to UTC on server
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
