// pnpm test src/actions/__tests__/agents.test.ts

import { eq } from 'drizzle-orm';
import { clerkClient, auth } from '@clerk/nextjs/server';
import type { Mock } from 'vitest';

import {
  type Agent,
  db,
  agents,
  users,
  orgs,
  agentRequestLogs,
} from '@roo-code-cloud/db/server';

import type { CreateAgentRequest } from '@/types';

import { createAgent, revokeAgent, updateAgentUsage } from '../agents';

const testUserId = 'user_2abc123def456ghi789';
const testOrgId = 'org_2abc123def456ghi789';

const testClerkAgentId = 'user_2xyz789abc456def123';

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => 'deadbeef'),
    })),
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
  auth: vi.fn(),
}));

describe('Agent Actions', () => {
  const mockClerkClient = {
    users: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    },
    organizations: {
      createOrganizationMembership: vi.fn(),
    },
  };

  beforeEach(async () => {
    (clerkClient as unknown as Mock).mockResolvedValue(mockClerkClient);

    // Clean up test data
    await db.delete(agents).where(eq(agents.orgId, testOrgId));
    await db.delete(agents).where(eq(agents.orgId, 'org_2different123456789'));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, 'user_2different123456789'));
    await db.delete(orgs).where(eq(orgs.id, testOrgId));
    await db.delete(orgs).where(eq(orgs.id, 'org_2different123456789'));

    // Create test organization
    await db.insert(orgs).values({
      id: testOrgId,
      name: 'Test Organization',
      slug: 'test-org',
      imageUrl: 'https://example.com/org-image.jpg',
      entity: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test user
    await db.insert(users).values({
      id: testUserId,
      orgId: testOrgId,
      orgRole: 'org:admin',
      name: 'Test User',
      email: 'test@example.com',
      imageUrl: 'https://example.com/image.jpg',
      entity: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('createAgent', () => {
    const validRequest: CreateAgentRequest = {
      displayName: 'Test Agent',
      description: 'A test agent',
    };

    beforeEach(() => {
      (auth as unknown as Mock).mockResolvedValue({
        userId: testUserId,
        orgId: testOrgId,
        orgRole: 'org:admin',
      });

      mockClerkClient.users.createUser.mockResolvedValue({
        id: testClerkAgentId,
      });
      mockClerkClient.organizations.createOrganizationMembership.mockResolvedValue(
        {},
      );
    });

    it('should create a new agent successfully', async () => {
      const result = await createAgent(validRequest);

      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('id', testClerkAgentId);
      expect(result).toHaveProperty('displayName', 'Test Agent');
      expect(result).toHaveProperty('description', 'A test agent');
      expect(result).toHaveProperty('orgId', testOrgId);
      expect(result).toHaveProperty('createdByUserId', testUserId);

      const agents_in_db = await db
        .select()
        .from(agents)
        .where(eq(agents.id, testClerkAgentId));

      expect(agents_in_db).toHaveLength(1);

      expect(mockClerkClient.users.createUser).toHaveBeenCalledWith({
        firstName: 'Test Agent',
        lastName: 'Agent',
        emailAddress: expect.arrayContaining([
          expect.stringContaining('@agents.'),
        ]),
        password: expect.any(String),
        skipPasswordChecks: true,
        skipPasswordRequirement: true,
      });

      expect(
        mockClerkClient.organizations.createOrganizationMembership,
      ).toHaveBeenCalledWith({
        organizationId: testOrgId,
        userId: testClerkAgentId,
        role: 'org:agent',
      });
    });

    it('should return error if user is not authenticated', async () => {
      (auth as unknown as Mock).mockResolvedValue({
        userId: null,
        orgId: null,
        orgRole: null,
      });

      const result = await createAgent(validRequest);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Unauthorized: User required');
    });

    it('should return error if user is not org admin', async () => {
      (auth as unknown as Mock).mockResolvedValue({
        userId: testUserId,
        orgId: testOrgId,
        orgRole: 'org:member',
      });

      const result = await createAgent(validRequest);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty(
        'error',
        'Insufficient permissions. Only organization admins can create agents.',
      );
    });

    it('should return error if display name is empty', async () => {
      const invalidRequest: CreateAgentRequest = { displayName: '' };
      const result = await createAgent(invalidRequest);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Display name is required.');
    });

    it('should return error if display name is too long', async () => {
      const invalidRequest: CreateAgentRequest = {
        displayName: 'a'.repeat(101),
      };
      const result = await createAgent(invalidRequest);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty(
        'error',
        'Display name must be 100 characters or less.',
      );
    });

    it('should handle Clerk API errors gracefully', async () => {
      mockClerkClient.users.createUser.mockRejectedValue(
        new Error('Clerk API error'),
      );

      const result = await createAgent(validRequest);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty(
        'error',
        'Failed to create agent. Please try again.',
      );
    });

    it('should trim whitespace from display name and description', async () => {
      const requestWithWhitespace: CreateAgentRequest = {
        displayName: '  Test Agent  ',
        description: '  A test agent  ',
      };

      const result = await createAgent(requestWithWhitespace);

      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('displayName', 'Test Agent');
      expect(result).toHaveProperty('description', 'A test agent');
    });
  });

  describe('revokeAgent', () => {
    let testAgent: Agent;

    beforeEach(async () => {
      (auth as unknown as Mock).mockResolvedValue({
        userId: testUserId,
        orgId: testOrgId,
        orgRole: 'org:admin',
      });

      // Create test agent
      const [agent] = await db
        .insert(agents)
        .values({
          id: testClerkAgentId,
          orgId: testOrgId,
          displayName: 'Test Agent',
          description: 'Agent to be revoked',
          createdByUserId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      testAgent = agent!;

      mockClerkClient.users.deleteUser.mockResolvedValue({});
    });

    it('should revoke an agent successfully', async () => {
      const result = await revokeAgent(testClerkAgentId);

      expect(result).toHaveProperty('success', true);

      const [revokedAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, testClerkAgentId));

      expect(revokedAgent).toBeDefined();
      expect(revokedAgent!.isActive).toBe(0);
      expect(revokedAgent!.updatedAt.getTime()).toBeGreaterThan(
        testAgent.updatedAt.getTime(),
      );

      expect(mockClerkClient.users.deleteUser).toHaveBeenCalledWith(
        testClerkAgentId,
      );
    });

    it('should return error if user is not authenticated', async () => {
      (auth as unknown as Mock).mockResolvedValue({
        userId: null,
        orgId: null,
        orgRole: null,
      });

      const result = await revokeAgent(testClerkAgentId);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error', 'Unauthorized: User required');
    });

    it('should return error if user is not org admin', async () => {
      (auth as unknown as Mock).mockResolvedValue({
        userId: testUserId,
        orgId: testOrgId,
        orgRole: 'org:member',
      });

      const result = await revokeAgent(testClerkAgentId);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty(
        'error',
        'Insufficient permissions. Only organization admins can revoke agents.',
      );
    });

    it('should return error if agent does not exist', async () => {
      const result = await revokeAgent('550e8400-e29b-41d4-a716-446655440099');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty(
        'error',
        'Agent not found or access denied.',
      );
    });

    it('should return error if agent belongs to different org', async () => {
      // Create different org first
      await db.insert(orgs).values({
        id: 'org_2different123456789',
        name: 'Different Organization',
        slug: 'different-org',
        imageUrl: 'https://example.com/different-org.jpg',
        entity: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create user for different org
      await db.insert(users).values({
        id: 'user_2different123456789',
        orgId: 'org_2different123456789',
        orgRole: 'org:admin',
        name: 'Different User',
        email: 'different@example.com',
        imageUrl: 'https://example.com/different-image.jpg',
        entity: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create agent in different org
      const [differentOrgAgent] = await db
        .insert(agents)
        .values({
          id: 'user_2different456def123',

          orgId: 'org_2different123456789',
          displayName: 'Different Org Agent',
          description: 'Agent in different org',
          createdByUserId: 'user_2different123456789',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      expect(differentOrgAgent).toBeDefined();
      const result = await revokeAgent(differentOrgAgent!.id);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty(
        'error',
        'Agent not found or access denied.',
      );
    });

    it('should handle Clerk API errors gracefully', async () => {
      mockClerkClient.users.deleteUser.mockRejectedValue(
        new Error('Clerk API error'),
      );

      const result = await revokeAgent(testClerkAgentId);

      expect(result).toHaveProperty('success', false);

      expect(result).toHaveProperty(
        'error',
        'Failed to revoke agent. Please try again.',
      );
    });
  });

  describe('updateAgentUsage', () => {
    let testAgent: Agent;

    beforeEach(async () => {
      const [agent] = await db
        .insert(agents)
        .values({
          id: testClerkAgentId,

          orgId: testOrgId,
          displayName: 'Test Agent',
          description: 'Agent for usage tracking',
          totalRequests: 5,
          createdByUserId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      testAgent = agent!;
    });

    it('should update agent usage successfully', async () => {
      const endpoint = '/api/orgs/test-org/data';
      const method = 'GET';
      const statusCode = 200;
      const responseTimeMs = 150;
      const userAgent = 'Test-Agent/1.0';
      const ipAddress = '192.168.1.1';

      await updateAgentUsage(
        testClerkAgentId,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        userAgent,
        ipAddress,
      );

      const [updatedAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, testClerkAgentId));

      expect(updatedAgent).toBeDefined();
      expect(updatedAgent!.totalRequests).toBe(6); // Increased from 5
      expect(updatedAgent!.lastUsedAt).not.toBeNull();
      expect(updatedAgent!.updatedAt.getTime()).toBeGreaterThan(
        testAgent.updatedAt.getTime(),
      );

      const requestLogs = await db
        .select()
        .from(agentRequestLogs)
        .where(eq(agentRequestLogs.agentId, testClerkAgentId));

      expect(requestLogs).toHaveLength(1);
      const log = requestLogs[0];
      expect(log).toBeDefined();
      expect(log!.endpoint).toBe(endpoint);
      expect(log!.method).toBe(method);
      expect(log!.statusCode).toBe(statusCode);
      expect(log!.responseTimeMs).toBe(responseTimeMs);
      expect(log!.userAgent).toBe(userAgent);
      expect(log!.ipAddress).toBe(ipAddress);
      expect(log!.orgId).toBe(testOrgId);
    });

    it('should handle missing userAgent and ipAddress', async () => {
      await updateAgentUsage(testClerkAgentId, '/api/test', 'POST', 201, 100);

      const requestLogs = await db
        .select()
        .from(agentRequestLogs)
        .where(eq(agentRequestLogs.agentId, testClerkAgentId));

      expect(requestLogs).toHaveLength(1);
      const log = requestLogs[0];
      expect(log).toBeDefined();
      expect(log!.userAgent).toBeNull();
      expect(log!.ipAddress).toBeNull();
    });

    it('should handle non-existent agent gracefully', async () => {
      await updateAgentUsage(
        'non-existent-clerk-agent',
        '/api/test',
        'GET',
        404,
        50,
      );
    });

    it('should handle database errors gracefully and not throw', async () => {
      await expect(
        updateAgentUsage(testClerkAgentId, '/api/test', 'GET', 200, 100),
      ).resolves.not.toThrow();
    });

    it('should create multiple request logs for multiple calls', async () => {
      await updateAgentUsage(
        testClerkAgentId,
        '/api/endpoint1',
        'GET',
        200,
        100,
      );

      await updateAgentUsage(
        testClerkAgentId,
        '/api/endpoint2',
        'POST',
        201,
        150,
      );

      await updateAgentUsage(
        testClerkAgentId,
        '/api/endpoint3',
        'PUT',
        200,
        200,
      );

      // Verify agent total requests updated correctly
      const [updatedAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, testClerkAgentId));

      expect(updatedAgent).toBeDefined();
      expect(updatedAgent!.totalRequests).toBe(8); // 5 initial + 3 new

      // Verify all request logs were created
      const requestLogs = await db
        .select()
        .from(agentRequestLogs)
        .where(eq(agentRequestLogs.agentId, testClerkAgentId));

      expect(requestLogs).toHaveLength(3);

      const endpoints = requestLogs.map((log) => log.endpoint).sort();

      expect(endpoints).toEqual([
        '/api/endpoint1',
        '/api/endpoint2',
        '/api/endpoint3',
      ]);
    });
  });
});
