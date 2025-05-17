import { CreateOrganization } from '@clerk/nextjs';

export default async function Page() {
  return <CreateOrganization afterCreateOrganizationUrl="/dashboard" />;
}
