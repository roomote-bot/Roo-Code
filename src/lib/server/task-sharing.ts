import { randomUUID } from 'crypto';

export function generateShareToken() {
  return randomUUID();
}
