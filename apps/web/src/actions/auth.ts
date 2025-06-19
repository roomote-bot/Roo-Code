'use server';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { type AuthResult, type ApiAuthResult, isOrgRole } from '@/types';
import { Env, logger } from '@/lib/server';
// import {
//   type AgentTokenPayload,
//   validateAgentToken,
// } from '@/lib/server/agent-auth';
// import { updateAgentUsage } from '@/actions/agents';

export async function authorize(): Promise<AuthResult> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized: User required' };
  }

  if (!orgId) {
    return { success: false, error: 'Unauthorized: Organization required' };
  }

  return {
    success: true,
    userType: 'user',
    userId,
    orgId,
    orgRole: isOrgRole(orgRole) ? orgRole : 'org:member',
  };
}

/**
 * Validates authentication and authorization for API endpoints.
 */
export async function authorizeApi(
  _request: NextRequest,
): Promise<ApiAuthResult> {
  return authorize();

  // const isAgent = request.headers.get('authorization')?.startsWith('Bearer ');

  // if (!isAgent) {
  //   return authorize();
  // }

  // const startTime = Date.now();

  // try {
  //   const authHeader = request.headers.get('authorization');

  //   if (!authHeader?.startsWith('Bearer ')) {
  //     return {
  //       success: false,
  //       error: 'Unauthorized: Missing authorization header',
  //     };
  //   }

  //   const token = authHeader.slice(7);

  //   if (!token) {
  //     return {
  //       success: false,
  //       error: 'Unauthorized: Malformed authorization header',
  //     };
  //   }

  //   let payload: AgentTokenPayload;

  //   try {
  //     payload = await validateAgentToken(token);
  //   } catch {
  //     return { success: false, error: 'Unauthorized: Invalid token' };
  //   }

  //   const { agent_id: userId, org_id: orgId } = payload;

  //   updateAgentUsage(
  //     userId,
  //     new URL(request.url).pathname,
  //     request.method,
  //     200,
  //     Date.now() - startTime,
  //     request.headers.get('user-agent') || undefined,
  //   );

  //   return { success: true, userType: 'agent', userId, orgId };
  // } catch (error) {
  //   console.error(
  //     `authorizeApi: ${error instanceof Error ? error.message : 'Unknown error'}`,
  //   );

  //   return { success: false, error: 'Unauthorized: Unexpected error' };
  // }
}

/**
 * Validates authentication and authorization for analytics functions.
 */
export async function authorizeAnalytics({
  requestedOrgId,
  requestedUserId,
  requireAdmin = false,
  allowCrossUserAccess = false,
}: {
  requestedOrgId?: string | null;
  requestedUserId?: string | null;
  requireAdmin?: boolean;
  allowCrossUserAccess?: boolean;
}) {
  const { orgId: authOrgId, orgRole, userId: authUserId } = await auth();

  // Ensure user is authenticated and belongs to the organization
  if (!authOrgId || !authUserId || authOrgId !== requestedOrgId) {
    throw new Error('Unauthorized: Invalid organization access');
  }

  // Check if admin access is required
  if (requireAdmin && orgRole !== 'org:admin') {
    throw new Error('Unauthorized: Administrator access required');
  }

  // If user is not an admin and trying to access data other than their own
  if (
    orgRole !== 'org:admin' &&
    requestedUserId &&
    requestedUserId !== authUserId
  ) {
    throw new Error('Unauthorized: Members can only access their own data');
  }

  // For non-admin users, force userId filter to their own ID
  // Unless allowCrossUserAccess is true and we're checking task sharing permissions
  const effectiveUserId =
    orgRole !== 'org:admin' && !allowCrossUserAccess
      ? authUserId
      : requestedUserId || null;

  return {
    authOrgId,
    authUserId,
    orgRole: isOrgRole(orgRole) ? orgRole : 'org:member',
    effectiveUserId,
  };
}

// Default expiration is 30 days (2592000 seconds).
export async function getSignInToken(
  userId: string,
): Promise<string | undefined> {
  const response = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    logger.error({
      event: 'sign_in_token_creation_failed',
      error: await response.json(),
      userId,
    });

    throw new Error('Failed to create sign-in token');
  }

  // TODO: Validate response with a schema.
  const data = await response.json();
  logger.info({ event: 'sign_in_token_created', userId });
  return data.token;
}
