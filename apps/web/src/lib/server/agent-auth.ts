import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { Env } from '@roo-code-cloud/env';

const agentTokenPayloadSchema = z.object({
  sub: z.string().min(1, 'Subject (sub) is required'),
  org_id: z.string().min(1, 'Organization ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  typ: z.literal('agent'),
  scope: z.literal('universal'),
  iat: z.number().int().positive('Issued at (iat) must be a positive integer'),
  exp: z.number().int().positive('Expiration (exp) must be a positive integer'),
});

export type AgentTokenPayload = z.infer<typeof agentTokenPayloadSchema>;

export async function getAgentToken(agentId: string, orgId: string) {
  return jwt.sign(
    {
      sub: agentId,
      org_id: orgId,
      agent_id: agentId,
      scope: 'universal',
      typ: 'agent',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    },
    Env.CLERK_SECRET_KEY,
    { algorithm: 'HS256' },
  );
}

export async function refreshAgentTokenIfNeeded(
  currentToken: string,
  agentId: string,
  orgId: string,
): Promise<string> {
  try {
    const decoded = jwt.decode(currentToken) as AgentTokenPayload | null;

    if (!decoded) {
      return await getAgentToken(agentId, orgId);
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;

    if (expiresIn < 60) {
      return await getAgentToken(agentId, orgId);
    }

    return currentToken;
  } catch {
    return await getAgentToken(agentId, orgId);
  }
}

export async function validateAgentToken(
  token: string,
): Promise<AgentTokenPayload> {
  try {
    const rawPayload = jwt.verify(token, Env.CLERK_SECRET_KEY, {
      algorithms: ['HS256'],
    });

    const parseResult = agentTokenPayloadSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      const validationErrors = parseResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      throw new Error(`Invalid agent token structure: ${validationErrors}`);
    }

    return parseResult.data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Invalid agent token structure')
    ) {
      throw error;
    }

    throw new Error('Invalid agent token');
  }
}
