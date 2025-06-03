export enum AuditLogTargetType {
  PROVIDER_WHITELIST = 1,
  DEFAULT_PARAMETERS = 2,
  MEMBER_CHANGE = 3, // TODO: Currently no logs of this type are collected.
  CLOUD_SETTINGS = 4,
  TASK_SHARE = 5,
}
