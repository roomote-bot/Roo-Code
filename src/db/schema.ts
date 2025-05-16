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
  MEMBER_CHANGE = 3, // TODO: Currently no logs of this type are collected
}

export type AuditLogType = Omit<typeof auditLogs.$inferSelect, 'targetType'> & {
  targetType: AuditLogTargetType;
};
