'use client';

import { useTheme } from 'next-themes';
import { dark } from '@clerk/themes';
import { OrganizationProfile } from '@clerk/nextjs';

export const OrgProfile = () => {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;

  return (
    <OrganizationProfile
      appearance={{ baseTheme }}
      routing="path"
      path="/dashboard/org"
      afterLeaveOrganizationUrl="/onboarding/select-org"
    />
  );
};
