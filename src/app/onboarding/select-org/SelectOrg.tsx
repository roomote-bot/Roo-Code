'use client';

import { useTheme } from 'next-themes';
import { dark } from '@clerk/themes';
import { OrganizationList } from '@clerk/nextjs';

export const SelectOrg = () => {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;

  return (
    <OrganizationList
      appearance={{ baseTheme }}
      afterSelectOrganizationUrl="/dashboard"
      afterCreateOrganizationUrl="/dashboard"
    />
  );
};
