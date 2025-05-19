'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrganizationList } from '@clerk/nextjs';

export const SelectOrg = () => {
  const searchParams = useSearchParams();

  const afterSelectOrganizationUrl = useMemo(() => {
    const state = searchParams.get('state');
    return state ? `/extension/sign-in?state=${state}` : '/dashboard';
  }, [searchParams]);

  return (
    <OrganizationList
      afterSelectOrganizationUrl={afterSelectOrganizationUrl}
      afterCreateOrganizationUrl={afterSelectOrganizationUrl}
      hidePersonal
    />
  );
};
