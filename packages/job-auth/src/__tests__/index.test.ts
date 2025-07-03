// pnpm test --filter @roo-code-cloud/job-auth

import jwt from 'jsonwebtoken';

import {
  createJobToken,
  validateJobToken,
  type JobTokenPayload,
} from '../index';

describe('job-auth', () => {
  const testPrivateKey = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgVTWTozeXjKjcNk+g
zTWjJHlt9W3NOY7Wr2egTq3W/2ehRANCAAQdNAio5NZLvXJ2mcNBkhzcAA63g17y
/1uIE2wJYtYN002cxgqqzyWIpZOB0BV9Bm6TIMBbeigHo83EPP4SAuIQ
-----END PRIVATE KEY-----`;

  beforeEach(() => {
    // Mock Date.now() to return a consistent timestamp
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createJobToken', () => {
    it('should create a valid job token', async () => {
      const jobId = 'job-123';
      const userId = 'user-456';
      const orgId = 'org-789';
      const timeoutMs = 30 * 60 * 1000; // 30 minutes

      const token = await createJobToken(jobId, userId, orgId, timeoutMs);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Verify the token can be decoded and has correct structure
      const decoded = jwt.decode(token) as JobTokenPayload;
      expect(decoded).toEqual({
        iss: 'rcc',
        sub: jobId,
        exp: 1672531200 + 30 * 60 + 5 * 60, // timeout + grace period
        iat: 1672531200, // 2023-01-01T00:00:00Z in seconds
        nbf: 1672531200 - 30, // iat - clock skew grace
        v: 1,
        r: {
          u: userId,
          o: orgId,
          t: 'cj',
        },
      });
    });

    it('should create token without orgId when null', async () => {
      const jobId = 'job-123';
      const userId = 'user-456';
      const orgId = null;
      const timeoutMs = 30 * 60 * 1000;

      const token = await createJobToken(jobId, userId, orgId, timeoutMs);
      const decoded = jwt.decode(token) as JobTokenPayload;

      expect(decoded.r.o).toBeUndefined();
      expect(decoded.r.u).toBe(userId);
    });

    it('should use correct issuer', async () => {
      const token = await createJobToken('job-1', 'user-1', null, 1000);
      const decoded = jwt.decode(token) as JobTokenPayload;

      expect(decoded.iss).toBe('rcc');
    });

    it('should set correct expiration time with grace period', async () => {
      const timeoutMs = 15 * 60 * 1000; // 15 minutes
      const token = await createJobToken('job-1', 'user-1', null, timeoutMs);
      const decoded = jwt.decode(token) as JobTokenPayload;

      const expectedExp = decoded.iat + Math.floor(timeoutMs / 1000) + 5 * 60; // timeout + 5 min grace
      expect(decoded.exp).toBe(expectedExp);
    });
  });

  describe('validateJobToken', () => {
    const validPayload: JobTokenPayload = {
      iss: 'rcc',
      sub: 'job-123',
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000) - 30,
      v: 1,
      r: {
        u: 'user-456',
        o: 'org-789',
        t: 'cj',
      },
    };

    it('should validate and return context for valid token', async () => {
      const token = jwt.sign(validPayload, testPrivateKey, {
        algorithm: 'ES256',
      });
      const result = await validateJobToken(token);

      expect(result).toEqual({
        jobId: 'job-123',
        userId: 'user-456',
        orgId: 'org-789',
        tokenType: 'cj',
        version: 1,
      });
    });

    it('should validate token without orgId', async () => {
      const payloadWithoutOrg = {
        ...validPayload,
        r: {
          u: 'user-456',
          t: 'cj' as const,
        },
      };

      const token = jwt.sign(payloadWithoutOrg, testPrivateKey, {
        algorithm: 'ES256',
      });
      const result = await validateJobToken(token);

      expect(result.orgId).toBeUndefined();
      expect(result.userId).toBe('user-456');
    });

    it('should throw error for invalid JWT signature', async () => {
      // Generate a different private key for testing wrong signature
      const wrongPrivateKey = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgDCtVZ3X8QqSHLcrp
NYfy87xEuVYS3cU3xztnRADyBJKhRANCAASXyME7rnCKJvIN+W9aYEkOjfCUk4Q6
G4d1mCKQT05YKo5JdhxbGD3gm3lP/U3NhY+GxA6Dy1BTAYy+dR7prjly
-----END PRIVATE KEY-----`;
      const tokenWithWrongSecret = jwt.sign(validPayload, wrongPrivateKey, {
        algorithm: 'ES256',
      });

      await expect(validateJobToken(tokenWithWrongSecret)).rejects.toThrow(
        'invalid signature',
      );
    });

    it('should throw error for expired JWT', async () => {
      const expiredPayload = {
        ...validPayload,
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      };
      const expiredToken = jwt.sign(expiredPayload, testPrivateKey, {
        algorithm: 'ES256',
      });

      await expect(validateJobToken(expiredToken)).rejects.toThrow(
        'jwt expired',
      );
    });

    it('should throw error for wrong issuer', async () => {
      const wrongIssuerPayload = {
        ...validPayload,
        iss: 'wrong-issuer',
      };
      const token = jwt.sign(wrongIssuerPayload, testPrivateKey, {
        algorithm: 'ES256',
      });

      await expect(validateJobToken(token)).rejects.toThrow(
        'jwt issuer invalid. expected: rcc',
      );
    });

    it('should throw specific error for invalid token structure', async () => {
      const invalidPayload = {
        ...validPayload,
        r: {
          u: '', // Invalid: empty string
          o: 'org-789',
          t: 'cj',
        },
      };
      const token = jwt.sign(invalidPayload, testPrivateKey, {
        algorithm: 'ES256',
      });

      await expect(validateJobToken(token)).rejects.toThrow(
        'Invalid job token structure: r.u: User ID is required',
      );
    });

    it('should throw error for wrong token type', async () => {
      const wrongTypePayload = {
        ...validPayload,
        r: {
          u: 'user-456',
          o: 'org-789',
          t: 'agent', // Should be 'cj'
        },
      };
      const token = jwt.sign(wrongTypePayload, testPrivateKey, {
        algorithm: 'ES256',
      });

      await expect(validateJobToken(token)).rejects.toThrow(
        'Invalid job token structure',
      );
    });

    it('should throw error for wrong version', async () => {
      const wrongVersionPayload = {
        ...validPayload,
        v: 2, // Should be 1
      };
      const token = jwt.sign(wrongVersionPayload, testPrivateKey, {
        algorithm: 'ES256',
      });

      await expect(validateJobToken(token)).rejects.toThrow(
        'Invalid job token structure: v: Version must be 1',
      );
    });

    it('should validate token created by createJobToken function', async () => {
      const jobId = 'test-job-456';
      const userId = 'test-user-789';
      const orgId = 'test-org-123';
      const timeoutMs = 30 * 60 * 1000;

      const token = await createJobToken(jobId, userId, orgId, timeoutMs);
      const validatedContext = await validateJobToken(token);

      expect(validatedContext.jobId).toBe(jobId);
      expect(validatedContext.userId).toBe(userId);
      expect(validatedContext.orgId).toBe(orgId);
      expect(validatedContext.tokenType).toBe('cj');
      expect(validatedContext.version).toBe(1);
    });

    it('should handle malformed JWT', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      await expect(validateJobToken(malformedToken)).rejects.toThrow(
        'jwt malformed',
      );
    });
  });
});
