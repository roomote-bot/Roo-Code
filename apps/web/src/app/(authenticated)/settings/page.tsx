import { redirect } from 'next/navigation';

import { authorize } from '@/actions/auth';

import { SettingsPage } from './SettingsPage';

export default async function Page() {
  const authResult = await authorize();

  // Only admins can access settings.
  if (!authResult.success || authResult.orgRole !== 'org:admin') {
    redirect('/usage');
  }

  return <SettingsPage />;
}
