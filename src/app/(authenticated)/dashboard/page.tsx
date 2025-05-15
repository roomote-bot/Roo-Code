import { useTranslations } from 'next-intl';

import { TitleBar } from '@/components/dashboard/TitleBar';
import { AuditLogCard } from '@/components/dashboard/AuditLogCard';
import { UsageAnalyticsCard } from '@/components/dashboard/UsageAnalyticsCard';

export default function Page() {
  const t = useTranslations('DashboardIndex');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />
      <UsageAnalyticsCard />
      <AuditLogCard />
    </>
  );
}
