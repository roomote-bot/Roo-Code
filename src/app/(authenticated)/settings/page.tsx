import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { SettingsPage } from './SettingsPage';

export default async function Settings() {
  const { orgRole } = await auth();

  // Only admins can access settings
  if (orgRole !== 'org:admin') {
    redirect('/usage');
  }

  return <SettingsPage />;
}

export const metadata = {
  title: 'Settings',
  description: 'Configure your organization settings',
};
