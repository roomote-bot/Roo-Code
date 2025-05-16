'use client';

import { useTranslations } from 'next-intl';

import {
  TitleBar,
  UsageAnalyticsCard,
  AuditLogCard,
} from '@/components/dashboard';

export const Dashboard = () => {
  const t = useTranslations('DashboardIndex');

  return (
    <>
      <TitleBar title={t('title_bar')} />
      <UsageAnalyticsCard />
      <AuditLogCard />
    </>
  );
};
