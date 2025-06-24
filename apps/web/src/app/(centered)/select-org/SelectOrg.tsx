'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OrganizationList, useOrganizationList, useClerk } from '@clerk/nextjs';
import { LoaderCircle } from 'lucide-react';

import { useAuthState } from '@/hooks/useAuthState';

export const SelectOrg = () => {
  const authState = useAuthState();
  const router = useRouter();
  const { setActive } = useClerk();

  const { isLoaded, userMemberships, userSuggestions, userInvitations } =
    useOrganizationList({
      userMemberships: true,
      userInvitations: true,
      userSuggestions: true,
    });

  const redirectUrl = authState.params
    ? `/extension/sign-in?${authState.params.toString()}`
    : '/usage';

  const isLoading =
    !isLoaded ||
    userMemberships.isLoading ||
    userInvitations.isLoading ||
    userSuggestions.isLoading;

  // Auto-redirect if user has no organizations or exactly one organization
  useEffect(() => {
    if (isLoaded) {
      const membershipCount = userMemberships.data?.length || 0;

      if (membershipCount === 0) {
        // No organizations - redirect directly
        router.push(redirectUrl);
      } else if (membershipCount === 1) {
        // One organization - set it as active and redirect
        const singleOrg = userMemberships.data[0];
        if (singleOrg) {
          setActive({ organization: singleOrg.organization.id })
            .then(() => {
              router.push(redirectUrl);
            })
            .catch((error: unknown) => {
              console.error('Failed to set active organization:', error);
              // If setting active org fails, fall back to showing the org list
            });
        }
      }
    }
  }, [isLoaded, userMemberships.data, redirectUrl, router, setActive]);

  if (isLoading) {
    return <LoaderCircle className="animate-spin" />;
  }

  // If user has 0 or 1 organizations, show loading while redirecting
  const membershipCount = userMemberships.data?.length || 0;
  if (membershipCount === 0 || membershipCount === 1) {
    return <LoaderCircle className="animate-spin" />;
  }

  return (
    <OrganizationList
      afterSelectOrganizationUrl={redirectUrl}
      afterCreateOrganizationUrl={redirectUrl}
      afterSelectPersonalUrl={redirectUrl}
      hidePersonal={false}
    />
  );
};
