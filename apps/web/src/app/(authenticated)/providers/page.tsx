import { redirect } from 'next/navigation';

import { authorize } from '@/actions/auth';

import { ProviderSettings } from './ProviderSettings';

export default async function Page() {
  const authResult = await authorize();

  // Only admins can access provider settings.
  if (!authResult.success || authResult.orgRole !== 'org:admin') {
    redirect('/usage');
  }

  return <ProviderSettings />;
}
