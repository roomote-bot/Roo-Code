import { SignUp } from '@clerk/nextjs';
import { getLocale, getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'SignUp' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export default function Page() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <SignUp />
    </div>
  );
}
