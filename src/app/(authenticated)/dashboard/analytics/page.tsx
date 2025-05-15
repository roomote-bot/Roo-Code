'use client';

import { useTranslations } from 'next-intl';

import { TitleBar } from '@/components/dashboard/TitleBar';
import { AnalyticsPage } from '@/components/analytics/AnalyticsPage';

const AnalyticsPageContainer = () => {
  const t = useTranslations('Analytics');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <AnalyticsPage />
    </>
  );
};

export default AnalyticsPageContainer;
