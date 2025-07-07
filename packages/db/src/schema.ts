import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

import {
  type OrganizationDefaultSettings,
  type OrganizationAllowList,
  type OrganizationCloudSettings,
  ORGANIZATION_ALLOW_ALL,
} from '@roo-code/types';

import { AuditLogTargetType } from './enums';
import { JobType, JobStatus, JobPayload } from './types';

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
  agents: many(agents),
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
    orgId: text('organization_id').references(() => orgs.id),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    shareToken: text('share_token').notNull().unique(),
    visibility: text('visibility').notNull().default('organization'),
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
    index('task_shares_visibility_idx').on(table.visibility),
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

/**
 * agents
 */

export const agents = pgTable(
  'agents',
  {
    id: text('id').notNull().primaryKey(), // Assigned by Clerk.
    orgId: text('organization_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    description: text('description'),
    isActive: integer('is_active').notNull().default(1), // Using integer for boolean compatibility
    lastUsedAt: timestamp('last_used_at'),
    totalRequests: integer('total_requests').notNull().default(0),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('agents_org_id_idx').on(table.orgId),
    index('agents_active_idx')
      .on(table.isActive)
      .where(sql`${table.isActive} = 1`),
    index('agents_last_used_idx').on(table.lastUsedAt),
  ],
);

export const agentsRelations = relations(agents, ({ one, many }) => ({
  org: one(orgs, {
    fields: [agents.orgId],
    references: [orgs.id],
  }),
  createdByUser: one(users, {
    fields: [agents.createdByUserId],
    references: [users.id],
  }),
  requestLogs: many(agentRequestLogs),
}));

/**
 * agentRequestLogs
 */

export const agentRequestLogs = pgTable(
  'agent_request_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    orgId: text('organization_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    method: text('method').notNull(),
    statusCode: integer('status_code').notNull(),
    responseTimeMs: integer('response_time_ms').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'), // Using text for IP addresses for simplicity
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('agent_request_logs_agent_id_idx').on(table.agentId),
    index('agent_request_logs_org_id_idx').on(table.orgId),
    index('agent_request_logs_created_at_idx').on(table.createdAt),
  ],
);

export const agentRequestLogsRelations = relations(
  agentRequestLogs,
  ({ one }) => ({
    agent: one(agents, {
      fields: [agentRequestLogs.agentId],
      references: [agents.id],
    }),
    org: one(orgs, {
      fields: [agentRequestLogs.orgId],
      references: [orgs.id],
    }),
  }),
);

/**
 * cloudJobs
 */

export const cloudJobs = pgTable(
  'cloud_jobs',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    type: text('type').notNull().$type<JobType>(),
    orgId: text('organization_id')
      .notNull()
      .references(() => orgs.id),
    userId: text('user_id').references(() => users.id),
    status: text('status').notNull().default('pending').$type<JobStatus>(),
    payload: jsonb('payload').notNull().$type<JobPayload>(),
    result: jsonb('result'),
    error: text('error'),
    slackThreadTs: text('slack_thread_ts'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('cloud_jobs_user_id_idx').on(table.userId),
    index('cloud_jobs_user_org_idx').on(table.userId, table.orgId),
  ],
);
