import type { OrgPermission, OrgRole } from '@/types/Auth';

declare global {
  interface ClerkAuthorization {
    permission: OrgPermission;
    role: OrgRole;
  }
}
