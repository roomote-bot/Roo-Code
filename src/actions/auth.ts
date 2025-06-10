'use server';

import { auth } from '@clerk/nextjs/server';

import type { ApiResponse } from '@/types';
import { Env, logger } from '@/lib/server';

export async function validateAuth(): Promise<
  { userId: string; orgId: string; orgRole: string } | ApiResponse
> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized: User required' };
  }

  if (!orgId) {
    return { success: false, error: 'Unauthorized: Organization required' };
  }

  return { userId, orgId, orgRole: orgRole || 'unknown' };
}

/**
 * Validates authentication and authorization for analytics functions.
 */
export async function validateAnalyticsAccess({
  requestedOrgId,
  requestedUserId,
  requireAdmin = false,
  allowCrossUserAccess = false,
}: {
  requestedOrgId?: string | null;
  requestedUserId?: string | null;
  requireAdmin?: boolean;
  allowCrossUserAccess?: boolean;
}): Promise<{
  authOrgId: string;
  authUserId: string;
  orgRole: string;
  effectiveUserId: string | null;
}> {
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
    orgRole: orgRole || 'unknown',
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
