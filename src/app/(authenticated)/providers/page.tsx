import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ProviderSettings } from './ProviderSettings';

export default async function Page() {
  const { orgRole } = await auth();

  // Only admins can access provider settings
  if (orgRole !== 'org:admin') {
    redirect('/usage');
  }

  return <ProviderSettings />;
}
