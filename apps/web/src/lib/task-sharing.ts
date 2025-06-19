import { shareIdSchema } from '@/types';

export function isValidShareToken(token: string): boolean {
  return shareIdSchema.safeParse(token).success;
}

export function isShareExpired(expiresAt: Date | null): boolean {
  return expiresAt ? new Date() > expiresAt : false;
}

export function calculateExpirationDate(days: number): Date {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
}

export function createShareUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/share/${token}`;
}

export const DEFAULT_SHARE_EXPIRATION_DAYS = 30;

export const MAX_SHARE_EXPIRATION_DAYS = 365;
