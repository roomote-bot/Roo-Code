import { useTranslations } from 'next-intl';

import { TitleBar } from '@/components/dashboard/TitleBar';

export default function Page() {
  const t = useTranslations('DashboardIndex');

  return (
    <TitleBar title={t('title_bar')} description={t('title_bar_description')} />
  );
}
