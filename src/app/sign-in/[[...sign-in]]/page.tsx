import { getLocale, getTranslations } from 'next-intl/server';

import { SignIn } from './SignIn';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'SignIn' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export default function Page() {
  return <SignIn />;
}
