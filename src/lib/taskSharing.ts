/**
 * UUID v4 validation regex pattern (RFC 4122 compliant)
 * Validates format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a token is a valid UUID format
 */
export function isValidShareToken(token: string): boolean {
  return UUID_V4_REGEX.test(token);
}

/**
 * Check if a share has expired
 */
export function isShareExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

/**
 * Calculate expiration date based on days from now
 */
export function calculateExpirationDate(days: number): Date {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
}

/**
 * Create a share URL from a token
 */
export function createShareUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/share/${token}`;
}

/**
 * Default expiration days for task shares
 */
export const DEFAULT_SHARE_EXPIRATION_DAYS = 30;

/**
 * Maximum expiration days allowed
 */
export const MAX_SHARE_EXPIRATION_DAYS = 365;
