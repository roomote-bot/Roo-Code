'use client';

import Link from 'next/link';
import { OrganizationList, useOrganizationList } from '@clerk/nextjs';
import { LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui';

export const SelectOrg = ({ state }: { state?: string }) => {
  const { isLoaded, userMemberships, userSuggestions, userInvitations } =
    useOrganizationList({
      userMemberships: true,
      userInvitations: true,
      userSuggestions: true,
    });

  const redirectUrl = state
    ? `/extension/sign-in?state=${state}`
    : '/dashboard';

  const isLoading =
    !isLoaded ||
    userMemberships.isLoading ||
    userInvitations.isLoading ||
    userSuggestions.isLoading;

  if (isLoading) {
    return (
      <div className="flex flex-row items-center gap-2">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  const isBlocked =
    userMemberships.count === 0 &&
    userInvitations.count === 0 &&
    userSuggestions.count === 0;

  if (isBlocked) {
    return (
      <div className="flex flex-row items-center gap-2">
        <div className="flex flex-col gap-2 items-center">
          <div>Roo Code Cloud is in closed beta.</div>
          <div>
            <Button asChild>
              <Link href="https://roocode.com/enterprise#contact">
                Request Early Access
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OrganizationList
      afterSelectOrganizationUrl={redirectUrl}
      afterCreateOrganizationUrl={redirectUrl}
      hidePersonal
    />
  );
};
