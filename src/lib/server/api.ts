import type { ApiResponse } from '@/types';
import { logger } from '@/lib/server';

export function isAuthSuccess(
  result: { userId: string; orgId: string } | ApiResponse,
): result is { userId: string; orgId: string } {
  return !('error' in result);
}

export function handleError(e: unknown, eventPrefix: string): ApiResponse {
  const error = e instanceof Error ? e.message : 'Unknown error';
  logger.error({ event: `${eventPrefix}_error`, error });
  return { success: false, error };
}
