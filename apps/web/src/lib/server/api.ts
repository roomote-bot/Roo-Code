import type { AuthError } from '@/types';

import { logger } from './logger';

export function handleError(e: unknown, eventPrefix: string): AuthError {
  const error = e instanceof Error ? e.message : 'Unknown error';
  logger.error({ event: `${eventPrefix}_error`, error });
  return { success: false, error };
}
