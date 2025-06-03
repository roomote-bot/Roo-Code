import {
  isValidShareToken,
  isShareExpired,
  calculateExpirationDate,
  createShareUrl,
  DEFAULT_SHARE_EXPIRATION_DAYS,
} from '../task-sharing';
import { generateShareToken } from '../server/task-sharing';

describe('taskSharing utilities', () => {
  describe('generateShareToken', () => {
    it('should generate a valid UUID token', () => {
      const token = generateShareToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(isValidShareToken(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = generateShareToken();
      const token2 = generateShareToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('isValidShareToken', () => {
    it('should validate correct UUID format', () => {
      const validToken = generateShareToken();
      expect(isValidShareToken(validToken)).toBe(true);
    });

    it('should reject invalid token formats', () => {
      expect(isValidShareToken('invalid-token')).toBe(false);
      expect(isValidShareToken('123')).toBe(false);
      expect(isValidShareToken('')).toBe(false);
      expect(isValidShareToken('not-a-uuid-at-all')).toBe(false);
    });
  });

  describe('isShareExpired', () => {
    it('should return false for null expiration', () => {
      expect(isShareExpired(null)).toBe(false);
    });

    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isShareExpired(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(isShareExpired(futureDate)).toBe(false);
    });
  });

  describe('calculateExpirationDate', () => {
    it('should calculate correct expiration date', () => {
      const days = 30;
      const expirationDate = calculateExpirationDate(days);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + days);

      // Allow for small time differences (within 1 minute)
      const timeDiff = Math.abs(
        expirationDate.getTime() - expectedDate.getTime(),
      );
      expect(timeDiff).toBeLessThan(60000); // 1 minute in milliseconds
    });

    it('should handle different day values', () => {
      const expirationDate1 = calculateExpirationDate(1);
      const expirationDate7 = calculateExpirationDate(7);

      const daysDiff =
        (expirationDate7.getTime() - expirationDate1.getTime()) /
        (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(6);
    });
  });

  describe('createShareUrl', () => {
    it('should create correct share URL', () => {
      const token = generateShareToken();
      const url = createShareUrl(token);

      expect(url).toContain('/share/');
      expect(url).toContain(token);
      expect(url).toMatch(/^https?:\/\/.+\/share\/.+$/);
    });
  });

  describe('constants', () => {
    it('should have correct default expiration days', () => {
      expect(DEFAULT_SHARE_EXPIRATION_DAYS).toBe(30);
      expect(typeof DEFAULT_SHARE_EXPIRATION_DAYS).toBe('number');
    });
  });
});
