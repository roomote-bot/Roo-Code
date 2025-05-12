import { getLocale, getTranslations } from 'next-intl/server';

import { SelectOrg } from './SelectOrg';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <SelectOrg />;
}
