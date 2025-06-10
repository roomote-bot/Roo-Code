'use client';

import { useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import * as Sentry from '@sentry/nextjs';

/**
 * Client-side component that sets Sentry user context based on Clerk authentication
 */
export function SentryUserContext() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  useEffect(() => {
    // Wait for both user and organization data to be loaded
    if (!userLoaded || !orgLoaded) {
      return;
    }

    if (user) {
      // Set user context with organization information if available
      Sentry.setUser({
        id: user.id,
        ...(organization && { orgId: organization.id }),
        ...(organization &&
          user.organizationMemberships?.[0]?.role && {
            orgRole: user.organizationMemberships[0].role,
          }),
      });

      // Set organization context if available
      if (organization) {
        Sentry.setContext('organization', {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          ...(user.organizationMemberships?.[0]?.role && {
            role: user.organizationMemberships[0].role,
          }),
        });
      } else {
        Sentry.setContext('organization', null);
      }
    } else {
      // Clear user context when not authenticated
      Sentry.setUser(null);
      Sentry.setContext('organization', null);
    }
  }, [user, organization, userLoaded, orgLoaded]);

  // This component doesn't render anything
  return null;
}
