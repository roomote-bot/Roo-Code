import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/server/logger';

/**
 * API endpoint for testing Clerk authentication.
 * Verifies/parses JWT and logs authenticated user information.
 */
export async function GET() {
  const authObj = await auth();

  if (!authObj.userId) {
    return NextResponse.json(
      { error: 'Unauthorized request' },
      { status: 401 },
    );
  }

  // Get the JWT token.
  const token = await authObj.getToken();

  // Extract user information from the auth object.
  // Only include properties that exist on the auth object.
  // Note: To get additional user data like email, firstName, lastName,
  // you would need to use Clerk's methods like clerkClient.users.getUser().
  const { userId, sessionId, orgId, orgRole } = authObj;
  const userInfo = { userId, sessionId, orgId, orgRole };

  // Just log if token exists, not the actual token for security.
  logger.info({ event: 'ping_endpoint_accessed', userInfo, hasToken: !!token });

  return NextResponse.json(userInfo);
}
