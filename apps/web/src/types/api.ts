/**
 * UserType
 */

const userTypes = ['user', 'agent', 'job'] as const;

export type UserType = (typeof userTypes)[number];

export const isUserType = (
  type: string | undefined | null,
): type is UserType => {
  return userTypes.includes(type as UserType);
};

/**
 * OrgRole
 */

const orgRoles = ['org:admin', 'org:member'] as const;

export type OrgRole = (typeof orgRoles)[number];

export const isOrgRole = (role: string | undefined | null): role is OrgRole => {
  return orgRoles.includes(role as OrgRole);
};

/**
 * Authentication
 */

export type AuthError = {
  success: false;
  error: string;
};

export type UserAuthSuccess = {
  success: true;
  userType: 'user';
  userId: string;
  orgId: string | null;
  orgRole: OrgRole | null;
};

export type AgentAuthSuccess = {
  success: true;
  userType: 'agent';
  userId: string;
  orgId: string;
};

export type JobAuthSuccess = {
  success: true;
  userType: 'job';
  userId: string;
  orgId: string | null;
  jobId: string;
};

export type AuthResult = UserAuthSuccess | AuthError;

export type ApiAuthResult =
  | UserAuthSuccess
  | AgentAuthSuccess
  | JobAuthSuccess
  | AuthError;
