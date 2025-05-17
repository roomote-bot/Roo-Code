import {
  ORGANIZATION_ALLOW_ALL,
  OrganizationDefaultSettings,
  type OrganizationAllowList,
} from '@/schemas';
import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
} from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id').notNull(),
  targetType: integer('target_type').notNull(), // AuditLogTargetType
  targetId: text('target_id').notNull(),
  newValue: jsonb('new_value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  description: text('description').notNull(),
});

export enum AuditLogTargetType {
  PROVIDER_WHITELIST = 1,
  DEFAULT_PARAMETERS = 2,
  MEMBER_CHANGE = 3, // TODO: Currently no logs of this type are collected.
}

export type AuditLog = typeof auditLogs.$inferSelect & {
  targetType: AuditLogTargetType;
};

export const organizationSettings = pgTable('organization_settings', {
  // Organization ID (from Clerk)
  organizationId: text('organization_id').notNull().primaryKey(),

  // Version number, incremented on updates
  version: integer('version').notNull().default(1),
  defaultSettings: jsonb('default_settings')
    .notNull()
    .$type<OrganizationDefaultSettings>()
    .default({}),
  allowList: jsonb('allow_list')
    .notNull()
    .$type<OrganizationAllowList>()
    .default(ORGANIZATION_ALLOW_ALL),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
