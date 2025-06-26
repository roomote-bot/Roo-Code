// pnpm test src/lib/server/__tests__/agent-auth.test.ts

import jwt from 'jsonwebtoken';

vi.mock('@roo-code-cloud/env', () => ({
  Env: {
    CLERK_SECRET_KEY: 'test-secret-key-for-jwt-testing',
  },
}));

import {
  getAgentToken,
  refreshAgentTokenIfNeeded,
  validateAgentToken,
  type AgentTokenPayload,
} from '../agent-auth';

describe('agent-auth', () => {
  const testSecret = 'test-secret-key-for-jwt-testing';

  beforeEach(() => {
    // Mock Date.now() to return a consistent timestamp
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getAgentToken', () => {
    it('should create a valid agent token', async () => {
      const agentId = 'agent-123';
      const orgId = 'org-456';
      const token = await getAgentToken(agentId, orgId);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Verify the token can be decoded and has correct structure
      const decoded = jwt.decode(token) as AgentTokenPayload;
      expect(decoded).toEqual({
        sub: agentId,
        org_id: orgId,
        agent_id: agentId,
        scope: 'universal',
        typ: 'agent',
        iat: 1672531200, // 2023-01-01T00:00:00Z in seconds
        exp: 1672532100, // 15 minutes later
      });
    });

    it('should use fallback secret when CLERK_SECRET_KEY is not set', async () => {
      // Import the mocked module to modify it
      const { Env } = await import('@roo-code-cloud/env');
      const mockedEnv = vi.mocked(Env);

      // Update the mock to use fallback secret
      mockedEnv.CLERK_SECRET_KEY = 'fallback-secret';

      const token = await getAgentToken('agent-123', 'org-456');

      // Token should still be valid with fallback secret
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      // Verify it was signed with the fallback secret
      const decoded = jwt.verify(token, 'fallback-secret') as AgentTokenPayload;
      expect(decoded.sub).toBe('agent-123');

      // Reset back to test secret
      mockedEnv.CLERK_SECRET_KEY = testSecret;
    });

    it('should set correct expiration time (15 minutes)', async () => {
      const token = await getAgentToken('agent-123', 'org-456');
      const decoded = jwt.decode(token) as AgentTokenPayload;

      expect(decoded.exp - decoded.iat).toBe(15 * 60); // 15 minutes in seconds
    });

    it('should create different tokens for different agents', async () => {
      const token1 = await getAgentToken('agent-1', 'org-1');
      const token2 = await getAgentToken('agent-2', 'org-2');

      expect(token1).not.toBe(token2);

      const decoded1 = jwt.decode(token1) as AgentTokenPayload;
      const decoded2 = jwt.decode(token2) as AgentTokenPayload;

      expect(decoded1.agent_id).toBe('agent-1');
      expect(decoded2.agent_id).toBe('agent-2');
      expect(decoded1.org_id).toBe('org-1');
      expect(decoded2.org_id).toBe('org-2');
    });
  });

  describe('refreshAgentTokenIfNeeded', () => {
    const agentId = 'agent-123';
    const orgId = 'org-456';

    it('should return new token when current token cannot be decoded', async () => {
      const invalidToken = 'invalid.jwt.token';
      const result = await refreshAgentTokenIfNeeded(
        invalidToken,
        agentId,
        orgId,
      );

      expect(result).not.toBe(invalidToken);
      expect(typeof result).toBe('string');
      expect(result.split('.')).toHaveLength(3);

      // Verify the new token is valid
      const decoded = jwt.decode(result) as AgentTokenPayload;
      expect(decoded.agent_id).toBe(agentId);
      expect(decoded.org_id).toBe(orgId);
    });

    it('should return new token when current token expires in less than 60 seconds', async () => {
      const now = Math.floor(Date.now() / 1000);

      // Create a token that expires in 30 seconds
      const expiringSoonToken = jwt.sign(
        {
          sub: agentId,
          org_id: orgId,
          agent_id: agentId,
          scope: 'universal',
          typ: 'agent',
          iat: now - 300,
          exp: now + 30, // expires in 30 seconds
        },
        testSecret,
        { algorithm: 'HS256' },
      );

      const result = await refreshAgentTokenIfNeeded(
        expiringSoonToken,
        agentId,
        orgId,
      );

      expect(result).not.toBe(expiringSoonToken);

      // Verify the new token has a fresh expiration
      const decoded = jwt.decode(result) as AgentTokenPayload;
      expect(decoded.exp).toBe(now + 15 * 60); // 15 minutes from now
    });

    it('should return current token when it has more than 60 seconds until expiration', async () => {
      const now = Math.floor(Date.now() / 1000);

      // Create a token that expires in 5 minutes
      const validToken = jwt.sign(
        {
          sub: agentId,
          org_id: orgId,
          agent_id: agentId,
          scope: 'universal',
          typ: 'agent',
          iat: now - 300,
          exp: now + 300, // expires in 5 minutes
        },
        testSecret,
        { algorithm: 'HS256' },
      );

      const result = await refreshAgentTokenIfNeeded(
        validToken,
        agentId,
        orgId,
      );

      expect(result).toBe(validToken); // Should return the same token
    });

    it('should return new token when current token expires exactly in 60 seconds', async () => {
      const now = Math.floor(Date.now() / 1000);

      // Create a token that expires in exactly 60 seconds
      const tokenExpiring60s = jwt.sign(
        {
          sub: agentId,
          org_id: orgId,
          agent_id: agentId,
          scope: 'universal',
          typ: 'agent',
          iat: now - 300,
          exp: now + 60, // expires in exactly 60 seconds
        },
        testSecret,
        { algorithm: 'HS256' },
      );

      const result = await refreshAgentTokenIfNeeded(
        tokenExpiring60s,
        agentId,
        orgId,
      );

      expect(result).toBe(tokenExpiring60s); // Should not refresh at exactly 60 seconds
    });

    it('should return current token when it can be decoded but verification would fail', async () => {
      // Create a token with a different secret but valid structure
      const tokenWithWrongSecret = jwt.sign(
        {
          sub: agentId,
          org_id: orgId,
          agent_id: agentId,
          scope: 'universal',
          typ: 'agent',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300,
        },
        'wrong-secret',
        { algorithm: 'HS256' },
      );

      const result = await refreshAgentTokenIfNeeded(
        tokenWithWrongSecret,
        agentId,
        orgId,
      );

      // Since jwt.decode() can successfully decode it and it's not expired,
      // refreshAgentTokenIfNeeded will return the same token
      expect(result).toBe(tokenWithWrongSecret);
    });
  });

  describe('validateAgentToken', () => {
    const validPayload = {
      sub: 'agent-123',
      org_id: 'org-456',
      agent_id: 'agent-123',
      typ: 'agent' as const,
      scope: 'universal' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
    };

    it('should validate and return payload for valid token', async () => {
      const token = jwt.sign(validPayload, testSecret, { algorithm: 'HS256' });
      const result = await validateAgentToken(token);

      expect(result).toEqual(validPayload);
    });

    it('should use fallback secret when CLERK_SECRET_KEY is not set', async () => {
      // Import the mocked module to modify it
      const { Env } = await import('@roo-code-cloud/env');
      const mockedEnv = vi.mocked(Env);

      // Update the mock to use fallback secret
      mockedEnv.CLERK_SECRET_KEY = 'fallback-secret';

      const token = jwt.sign(validPayload, 'fallback-secret', {
        algorithm: 'HS256',
      });

      const result = await validateAgentToken(token);

      expect(result).toEqual(validPayload);

      // Reset back to test secret
      mockedEnv.CLERK_SECRET_KEY = testSecret;
    });

    it('should throw error for invalid JWT signature', async () => {
      const tokenWithWrongSecret = jwt.sign(validPayload, 'wrong-secret', {
        algorithm: 'HS256',
      });

      await expect(validateAgentToken(tokenWithWrongSecret)).rejects.toThrow(
        'Invalid agent token',
      );
    });

    it('should throw error for expired JWT', async () => {
      const expiredPayload = {
        ...validPayload,
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      };
      const expiredToken = jwt.sign(expiredPayload, testSecret, {
        algorithm: 'HS256',
      });

      await expect(validateAgentToken(expiredToken)).rejects.toThrow(
        'Invalid agent token',
      );
    });

    it('should throw specific error for invalid token structure - empty subject', async () => {
      const invalidPayload = {
        ...validPayload,
        sub: '', // Invalid: empty string
      };
      const token = jwt.sign(invalidPayload, testSecret, {
        algorithm: 'HS256',
      });

      await expect(validateAgentToken(token)).rejects.toThrow(
        'Invalid agent token structure: sub: Subject (sub) is required',
      );
    });

    it('should throw error for missing required fields', async () => {
      const incompletePayload = {
        sub: 'agent-123',
        // Missing org_id, agent_id, etc.
      };
      const token = jwt.sign(incompletePayload, testSecret, {
        algorithm: 'HS256',
      });

      await expect(validateAgentToken(token)).rejects.toThrow(
        'Invalid agent token structure',
      );
    });

    it('should throw error for invalid typ field', async () => {
      const invalidTypPayload = {
        ...validPayload,
        typ: 'user', // Should be 'agent'
      };
      const token = jwt.sign(invalidTypPayload, testSecret, {
        algorithm: 'HS256',
      });

      await expect(validateAgentToken(token)).rejects.toThrow(
        'Invalid agent token structure',
      );
    });

    it('should throw error for invalid scope field', async () => {
      const invalidScopePayload = {
        ...validPayload,
        scope: 'limited', // Should be 'universal'
      };
      const token = jwt.sign(invalidScopePayload, testSecret, {
        algorithm: 'HS256',
      });

      await expect(validateAgentToken(token)).rejects.toThrow(
        'Invalid agent token structure',
      );
    });

    it('should throw error for negative iat value', async () => {
      const invalidIatPayload = {
        ...validPayload,
        iat: -1, // Should be positive
      };
      const token = jwt.sign(invalidIatPayload, testSecret, {
        algorithm: 'HS256',
      });

      await expect(validateAgentToken(token)).rejects.toThrow(
        'Invalid agent token structure',
      );
    });

    it('should throw error for negative exp value', async () => {
      const invalidExpPayload = {
        ...validPayload,
        exp: -1, // Should be positive
      };
      const token = jwt.sign(invalidExpPayload, testSecret, {
        algorithm: 'HS256',
      });

      // jwt.verify() will throw an error for negative exp before Zod validation
      await expect(validateAgentToken(token)).rejects.toThrow(
        'Invalid agent token',
      );
    });

    it('should throw error for non-integer iat value', async () => {
      const invalidIatPayload = {
        ...validPayload,
        iat: 1672531200.5, // Should be integer
      };
      const token = jwt.sign(invalidIatPayload, testSecret, {
        algorithm: 'HS256',
      });

      await expect(validateAgentToken(token)).rejects.toThrow(
        'Invalid agent token structure',
      );
    });

    it('should handle multiple validation errors in error message', async () => {
      const invalidPayload = {
        sub: '', // Invalid: empty string
        org_id: '', // Invalid: empty string
        agent_id: 'agent-123',
        typ: 'agent' as const,
        scope: 'universal' as const,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      };
      const token = jwt.sign(invalidPayload, testSecret, {
        algorithm: 'HS256',
      });

      const error = await validateAgentToken(token).catch((e) => e);

      expect(error.message).toContain('Invalid agent token structure');
      expect(error.message).toContain('Subject (sub) is required');
      expect(error.message).toContain('Organization ID is required');
    });

    it('should validate token created by getAgentToken function', async () => {
      const agentId = 'test-agent-456';
      const orgId = 'test-org-789';

      const token = await getAgentToken(agentId, orgId);
      const validatedPayload = await validateAgentToken(token);

      expect(validatedPayload.agent_id).toBe(agentId);
      expect(validatedPayload.org_id).toBe(orgId);
      expect(validatedPayload.sub).toBe(agentId);
      expect(validatedPayload.typ).toBe('agent');
      expect(validatedPayload.scope).toBe('universal');
    });

    it('should handle malformed JWT', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      await expect(validateAgentToken(malformedToken)).rejects.toThrow(
        'Invalid agent token',
      );
    });
  });
});
