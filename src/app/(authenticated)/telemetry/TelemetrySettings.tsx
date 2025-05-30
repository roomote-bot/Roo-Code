'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { getOrganizationSettings } from '@/actions/organizationSettings';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Loading } from '@/components/layout';

import { TelemetryForm } from './TelemetryForm';

export const TelemetrySettings = () => {
  const t = useTranslations('TelemetrySettings');

  const { data: orgSettings } = useQuery({
    queryKey: ['getOrganizationSettings'],
    queryFn: getOrganizationSettings,
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
      </Card>
      {orgSettings ? <TelemetryForm orgSettings={orgSettings} /> : <Loading />}
    </>
  );
};
