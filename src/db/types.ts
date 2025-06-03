import type { users, orgs, orgSettings, auditLogs, taskShares } from './schema';

type Generated = 'id' | 'createdAt' | 'updatedAt';

/**
 * users
 */

export type User = typeof users.$inferSelect;

export type CreateUser = Omit<typeof users.$inferInsert, Generated>;

/**
 * orgs
 */

export type Org = typeof orgs.$inferSelect;

export type CreateOrg = Omit<typeof orgs.$inferInsert, Generated>;

/**
 * orgSettings
 */

export type OrgSettings = typeof orgSettings.$inferSelect;

export type CreateOrgSettings = Omit<
  typeof orgSettings.$inferInsert,
  Generated
>;

/**
 * auditLogs
 */

export type AuditLog = typeof auditLogs.$inferSelect;

export type CreateAuditLog = Omit<typeof auditLogs.$inferInsert, Generated>;

export type AuditLogWithUser = AuditLog & {
  user: User;
};

/**
 * taskShares
 */

export type TaskShare = typeof taskShares.$inferSelect;

export type CreateTaskShare = Omit<typeof taskShares.$inferInsert, Generated>;
