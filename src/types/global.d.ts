import type { OrgPermission, OrgRole } from '@/types/auth';

declare global {
  interface ClerkAuthorization {
    permission: OrgPermission;
    role: OrgRole;
  }
}
