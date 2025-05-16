'use client';

import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

import type { Usage } from '@/actions/analytics';

import {
  TitleBar,
  UsageAnalyticsCard,
  AuditLogCard,
} from '@/components/dashboard';

export const Dashboard = ({ usage }: { usage: Usage }) => {
  const { userId, orgId } = useAuth();
  const t = useTranslations('DashboardIndex');

  return (
    <>
      <TitleBar title={t('title_bar')} />
      <div>Org: {orgId}</div>
      <div>User: {userId}</div>
      <pre>Usage: {JSON.stringify(usage, null, 2)}</pre>
      <UsageAnalyticsCard />
      <AuditLogCard />
    </>
  );
};
