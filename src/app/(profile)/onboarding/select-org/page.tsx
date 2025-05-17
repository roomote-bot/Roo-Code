import { OrganizationList } from '@clerk/nextjs';

export default async function Page() {
  return (
    <OrganizationList
      afterSelectOrganizationUrl="/dashboard"
      afterCreateOrganizationUrl="/dashboard"
      hidePersonal
    />
  );
}
