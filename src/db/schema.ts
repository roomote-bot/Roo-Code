import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import {
  type OrganizationDefaultSettings,
  type OrganizationAllowList,
  type OrganizationCloudSettings,
  ORGANIZATION_ALLOW_ALL,
} from '@roo-code/types';

import { AuditLogTargetType } from './enums';

/**
 * users
 */

export const users = pgTable(
  'users',
  {
    id: text('id').notNull().primaryKey(), // Assigned by Clerk.
    orgId: text('organization_id').references(() => orgs.id),
    orgRole: text('organization_role'),
    name: text('name').notNull(),
    email: text('email').notNull(),
    imageUrl: text('image_url').notNull(),
    entity: jsonb('entity').notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('users_organization_id_idx').on(table.orgId),
    index('users_organization_role_idx').on(table.orgId, table.orgRole),
    index('users_email_idx').on(table.email),
    index('users_created_at_idx').on(table.createdAt),
  ],
);

export const userRelations = relations(users, ({ one }) => ({
  org: one(orgs, {
    fields: [users.orgId],
    references: [orgs.id],
  }),
}));

/**
 * organizations
 */

export const orgs = pgTable(
  'organizations',
  {
    id: text('id').notNull().primaryKey(), // Assigned by Clerk.
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    imageUrl: text('image_url').notNull(),
    entity: jsonb('entity').notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('organizations_slug_idx').on(table.slug),
    index('organizations_created_at_idx').on(table.createdAt),
  ],
);

export const orgsRelations = relations(orgs, ({ many, one }) => ({
  users: many(users),
  auditLogs: many(auditLogs),
  taskShares: many(taskShares),
  orgSettings: one(orgSettings, {
    fields: [orgs.id],
    references: [orgSettings.orgId],
  }),
}));

/**
 * organization_settings
 */

export const orgSettings = pgTable(
  'organization_settings',
  {
    orgId: text('organization_id')
      .notNull()
      .primaryKey()
      .references(() => orgs.id), // Assigned by Clerk.
    version: integer('version').notNull().default(1),
    cloudSettings: jsonb('cloud_settings')
      .notNull()
      .$type<OrganizationCloudSettings>()
      .default({}),
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
  },
  (table) => [
    index('organization_settings_created_at_idx').on(table.createdAt),
  ],
);

export const orgSettingsRelations = relations(orgSettings, ({ one }) => ({
  org: one(orgs, {
    fields: [orgSettings.orgId],
    references: [orgs.id],
  }),
}));

/**
 * audit_logs
 */

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    orgId: text('organization_id')
      .notNull()
      .references(() => orgs.id),
    targetType: integer('target_type').$type<AuditLogTargetType>().notNull(),
    targetId: text('target_id').notNull(),
    newValue: jsonb('new_value').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    description: text('description').notNull(),
  },
  (table) => [
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_organization_id_idx').on(table.orgId),
    index('audit_logs_target_idx').on(table.targetType, table.targetId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ],
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  org: one(orgs, {
    fields: [auditLogs.orgId],
    references: [orgs.id],
  }),
}));

/**
 * task_shares
 */

export const taskShares = pgTable(
  'task_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: text('task_id').notNull(),
    orgId: text('organization_id')
      .notNull()
      .references(() => orgs.id),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    shareToken: text('share_token').notNull().unique(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('task_shares_share_token_idx').on(table.shareToken),
    index('task_shares_task_id_idx').on(table.taskId),
    index('task_shares_org_id_idx').on(table.orgId),
    index('task_shares_expires_at_idx').on(table.expiresAt),
    index('task_shares_created_by_user_id_idx').on(table.createdByUserId),
  ],
);

export const taskSharesRelations = relations(taskShares, ({ one }) => ({
  org: one(orgs, {
    fields: [taskShares.orgId],
    references: [orgs.id],
  }),
  createdByUser: one(users, {
    fields: [taskShares.createdByUserId],
    references: [users.id],
  }),
}));
