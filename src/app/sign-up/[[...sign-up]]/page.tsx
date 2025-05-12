import { getLocale, getTranslations } from 'next-intl/server';

import { SignUp } from './SignUp';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'SignUp' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export default function Page() {
  return <SignUp />;
}
