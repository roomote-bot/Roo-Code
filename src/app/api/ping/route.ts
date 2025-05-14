import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/server/logger';

/**
 * API endpoint for testing Clerk authentication
 * Verifies/parses JWT and logs authenticated user information
 */
export async function GET() {
  const authObj = await auth();

  // If not authenticated
  if (!authObj.userId) {
    return NextResponse.json(
      { error: 'Unauthorized request' },
      { status: 401 },
    );
  }

  // Get the JWT token
  const token = await authObj.getToken();

  // Extract user information from the auth object
  // Only include properties that exist on the auth object
  const userInfo = {
    userId: authObj.userId,
    sessionId: authObj.sessionId,
    orgId: authObj.orgId,
    orgRole: authObj.orgRole,
    // Note: To get additional user data like email, firstName, lastName,
    // you would need to use Clerk's methods like clerkClient.users.getUser()
  };

  // Log the user information
  logger.info({
    event: 'ping_endpoint_accessed',
    userInfo: {
      userId: authObj.userId,
      sessionId: authObj.sessionId,
      orgId: authObj.orgId,
      orgRole: authObj.orgRole,
    },
    hasToken: !!token, // Just log if token exists, not the actual token for security
  });

  // Return the user information
  return NextResponse.json({
    authenticated: true,
    userInfo,
  });
}
