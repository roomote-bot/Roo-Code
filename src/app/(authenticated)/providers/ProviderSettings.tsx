'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { getOrganizationSettings } from '@/actions/organizationSettings';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@/components/ui';
import { Loading } from '@/components/layout';

import { ProviderForm } from './ProviderForm';

export const ProviderSettings = () => {
  const t = useTranslations('ProviderSettings');

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
        <CardContent>
          <Badge variant="outline" className="text-xs">
            {`Policy v${orgSettings?.version || 1}`}
          </Badge>
        </CardContent>
      </Card>
      {orgSettings ? <ProviderForm orgSettings={orgSettings} /> : <Loading />}
    </>
  );
};
