'use client';

import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Loading } from '@/components/layout';

import { SettingsForm } from './SettingsForm';

export const SettingsPage = () => {
  const { data: orgSettings } = useOrganizationSettings();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Configure your organization&apos;s settings and preferences.
          </CardDescription>
        </CardHeader>
      </Card>
      {orgSettings ? <SettingsForm orgSettings={orgSettings} /> : <Loading />}
    </>
  );
};
