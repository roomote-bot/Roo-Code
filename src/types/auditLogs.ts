import { z } from 'zod';

/**
 * Client-safe type definitions for audit logs
 * These types mirror the database schema but are safe to import in client components
 */

export enum AuditLogTargetType {
  PROVIDER_WHITELIST = 1,
  DEFAULT_PARAMETERS = 2,
  MEMBER_CHANGE = 3, // TODO: Currently no logs of this type are collected
}

export interface AuditLogType {
  id: string;
  userId: string;
  organizationId: string;
  targetType: AuditLogTargetType;
  targetId: string;
  newValue: unknown; // JSONB in the database
  createdAt: Date;
  description: string;
}

// Validation schema for audit log creation
export const auditLogSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  // You should only create audit logs for the authenticated organization
  organizationId: z.string().min(1, 'Organization ID is required'),
  targetType: z.nativeEnum(AuditLogTargetType, {
    errorMap: () => ({ message: 'Target type must be a valid enum value' }),
  }),
  targetId: z.string().min(1, 'Target ID is required'),
  newValue: z.any().refine((val) => val !== undefined, 'New value is required'),
  description: z.string().min(1, 'Description is required'),
});
