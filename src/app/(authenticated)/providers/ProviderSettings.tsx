'use client';

import { useTranslations } from 'next-intl';

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
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';

export const ProviderSettings = () => {
  const t = useTranslations('ProviderSettings');
  const { data, isPending } = useOrganizationSettings();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-xs">
            {`Policy v${data?.version || 1}`}
          </Badge>
        </CardContent>
      </Card>
      {isPending ? <Loading /> : <ProviderForm />}
    </>
  );
};
