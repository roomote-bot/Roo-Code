import { OrganizationList } from '@clerk/nextjs';

export const SelectOrg = ({ state }: { state?: string }) => {
  const redirectUrl = state
    ? `/extension/sign-in?state=${state}`
    : '/dashboard';

  return (
    <OrganizationList
      afterSelectOrganizationUrl={redirectUrl}
      afterCreateOrganizationUrl={redirectUrl}
      hidePersonal
    />
  );
};
