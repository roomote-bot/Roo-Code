'use server';

import { auth } from '@clerk/nextjs/server';

import type { ApiResponse } from '@/types';
import { Env, logger } from '@/lib/server';

export async function validateAuth(): Promise<
  { userId: string; orgId: string } | ApiResponse
> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized: User required' };
  }

  if (!orgId) {
    return { success: false, error: 'Unauthorized: Organization required' };
  }

  return { userId, orgId };
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
