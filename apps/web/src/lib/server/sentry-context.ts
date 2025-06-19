import * as Sentry from '@sentry/nextjs';

export interface SentryUserContext {
  id: string;
  orgId?: string | null;
  orgRole?: string | null;
}

/**
 * Sets the Sentry user context for server-side error tracking
 */
export function setSentryUserContext(context: SentryUserContext) {
  Sentry.setUser({
    id: context.id,
    ...(context.orgId && { orgId: context.orgId }),
    ...(context.orgRole && { orgRole: context.orgRole }),
  });
}

/**
 * Clears the Sentry user context
 */
export function clearSentryUserContext() {
  Sentry.setUser(null);
}

/**
 * Sets Sentry context with additional organization information
 */
export function setSentryOrganizationContext(
  orgId: string,
  orgRole?: string | null,
) {
  Sentry.setContext('organization', {
    id: orgId,
    ...(orgRole && { role: orgRole }),
  });
}
