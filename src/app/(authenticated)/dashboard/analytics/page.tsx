import { getLocale, getTranslations } from 'next-intl/server';

import { TitleBar } from '@/components/dashboard/TitleBar';

import { Analytics } from './Analytics';

export default async function Page() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Analytics' });

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />
      <Analytics />
    </>
  );
}
