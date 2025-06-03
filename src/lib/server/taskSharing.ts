import { randomUUID } from 'crypto';

/**
 * Generate a cryptographically secure share token
 *
 * @server-only This function uses Node.js crypto module and cannot be imported client-side
 */
export function generateShareToken(): string {
  return randomUUID();
}
