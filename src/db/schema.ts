import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
} from 'drizzle-orm/pg-core';

// AuditLogType
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
