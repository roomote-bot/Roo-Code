'use client';

import { useTheme } from 'next-themes';
import { CreateOrganization } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export const CreateOrg = () => {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;

  return (
    <CreateOrganization
      appearance={{ baseTheme }}
      afterCreateOrganizationUrl="/dashboard"
    />
  );
};
