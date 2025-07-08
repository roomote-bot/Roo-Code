'use server';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Env } from '@roo-code-cloud/env';

import { type AuthResult, type ApiAuthResult, isOrgRole } from '@/types';
import { logger } from '@/lib/server';
import { validateJobToken } from '@roo-code-cloud/job-auth';

export async function authorize(): Promise<AuthResult> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized: User required' };
  }

  if (!orgId) {
    return {
      success: true,
      userType: 'user',
      userId,
      orgId: null,
      orgRole: null,
    };
  }

  return {
    success: true,
    userType: 'user',
    userId,
    orgId,
    orgRole: isOrgRole(orgRole) ? orgRole : 'org:member',
  };
}

export async function authorizeApi(
  request: NextRequest,
): Promise<ApiAuthResult> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return authorize();
  }

  const token = authHeader.slice(7);

  if (!token) {
    return {
      success: false,
      error: 'Unauthorized: Malformed authorization header',
    };
  }

  try {
    const jobContext = await validateJobToken(token);

    return {
      success: true,
      userType: 'job',
      userId: jobContext.userId,
      orgId: jobContext.orgId || null,
      jobId: jobContext.jobId,
    };
  } catch {
    return authorize();
  }
}

export async function authorizeAnalytics({
  requestedOrgId,
  requestedUserId,
  requireAdmin = false,
}: {
  requestedOrgId?: string | null;
  requestedUserId?: string | null;
  requireAdmin?: boolean;
}) {
  const { orgId: authOrgId, orgRole, userId: authUserId } = await auth();

  if (!authUserId) {
    throw new Error('Unauthorized: User required');
  }

  // Personal account access
  if (!authOrgId && !requestedOrgId) {
    if (requestedUserId && requestedUserId !== authUserId) {
      throw new Error(
        'Unauthorized: Personal users can only access their own data',
      );
    }

    return {
      authOrgId: null,
      authUserId,
      orgRole: null,
      isAdmin: false,
    };
  }

  // Organization account access
  if (!authOrgId || !authUserId || authOrgId !== requestedOrgId) {
    throw new Error('Unauthorized: Invalid organization access');
  }

  if (requireAdmin && orgRole !== 'org:admin') {
    throw new Error('Unauthorized: Administrator access required');
  }

  const isAdmin = orgRole === 'org:admin';

  return {
    authOrgId,
    authUserId,
    orgRole: isOrgRole(orgRole) ? orgRole : 'org:member',
    isAdmin,
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
