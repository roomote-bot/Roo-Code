import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/server/logger';

export type ApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Validates user authentication and organization membership
 * @returns User and organization IDs if authenticated, or error response if not
 */
export async function validateAuth(): Promise<
  { userId: string; orgId: string } | ApiResponse
> {
  const { userId, orgId } = await auth();
  if (!userId) {
    return {
      success: false,
      error: 'Unauthorized: User required',
    };
  }
  if (!orgId) {
    return {
      success: false,
      error: 'Unauthorized: Organization required',
    };
  }
  return { userId, orgId };
}

export function isAuthSuccess(
  result: { userId: string; orgId: string } | ApiResponse,
): result is { userId: string; orgId: string } {
  return !('error' in result);
}

/**
 * Generic error handler for all operations
 * @param error The caught error
 * @param eventPrefix Prefix for logging events
 * @returns Error response
 */
export function handleError(error: unknown, eventPrefix: string): ApiResponse {
  logger.error({
    event: `${eventPrefix}_update_error`,
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  return {
    success: false,
    error:
      error instanceof Error ? error.message : 'An unexpected error occurred',
  };
}
