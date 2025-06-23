'use server';

import { eq, and } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import crypto from 'crypto';

import {
  type Agent,
  db,
  agents,
  agentRequestLogs,
} from '@roo-code-cloud/db/server';
import {
  type CreateAgentRequest,
  createAgentRequestSchema,
} from '@/types/agents';

import { authorize } from './auth';

export async function createAgent(
  request: CreateAgentRequest,
): Promise<Agent | { success: false; error: string }> {
  try {
    const authResult = await authorize();

    if (!authResult.success) {
      return authResult;
    }

    const { userId, orgId, orgRole } = authResult;

    // Agents are only available for organizations, not personal accounts
    if (!orgId || !orgRole) {
      return {
        success: false,
        error: 'Agents are only available for organization accounts.',
      };
    }

    if (orgRole !== 'org:admin') {
      return {
        success: false,
        error:
          'Insufficient permissions. Only organization admins can create agents.',
      };
    }

    const validationResult = createAgentRequestSchema.safeParse(request);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];

      return {
        success: false,
        error: firstError?.message || 'Invalid request data.',
      };
    }

    const { displayName, description } = validationResult.data;
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const agentEmail = `agent-${timestamp}-${randomSuffix}@agents.${orgId}.local`;

    const client = await clerkClient();

    const clerkUser = await client.users.createUser({
      firstName: displayName,
      lastName: 'Agent',
      emailAddress: [agentEmail],
      password: crypto.randomBytes(32).toString('hex'),
      skipPasswordChecks: true,
      skipPasswordRequirement: true,
    });

    await client.organizations.createOrganizationMembership({
      organizationId: orgId,
      userId: clerkUser.id,
      role: 'org:agent',
    });

    const agentData = {
      id: clerkUser.id,
      orgId,
      displayName: displayName.trim(),
      description: description?.trim() || null,
      createdByUserId: userId,
    };

    const [newAgent] = await db.insert(agents).values(agentData).returning();

    if (!newAgent) {
      throw new Error('Failed to create agent in database');
    }

    return newAgent;
  } catch {
    return {
      success: false,
      error: 'Failed to create agent. Please try again.',
    };
  }
}

export async function revokeAgent(
  agentId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const authResult = await authorize();

    if (!authResult.success) {
      return authResult;
    }

    const { orgId, orgRole } = authResult;

    // Agents are only available for organizations, not personal accounts
    if (!orgId || !orgRole) {
      return {
        success: false,
        error: 'Agents are only available for organization accounts.',
      };
    }

    if (orgRole !== 'org:admin') {
      return {
        success: false,
        error:
          'Insufficient permissions. Only organization admins can revoke agents.',
      };
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.orgId, orgId)))
      .limit(1);

    if (!agent) {
      return {
        success: false,
        error: 'Agent not found or access denied.',
      };
    }

    const client = await clerkClient();
    await client.users.deleteUser(agent.id);

    await db
      .update(agents)
      .set({
        isActive: 0,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Failed to revoke agent. Please try again.',
    };
  }
}

export async function updateAgentUsage(
  agentId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  userAgent?: string,
  ipAddress?: string,
): Promise<void> {
  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      return;
    }

    await db
      .update(agents)
      .set({
        lastUsedAt: new Date(),
        totalRequests: agent.totalRequests + 1,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));

    await db.insert(agentRequestLogs).values({
      agentId: agent.id,
      orgId: agent.orgId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      userAgent,
      ipAddress,
    });
  } catch {
    // NO-OP
  }
}
