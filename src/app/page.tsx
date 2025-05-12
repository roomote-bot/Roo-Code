import { redirect } from 'next/navigation';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

import { Navbar, Footer } from '@/components/layout';
import { Hero, Features } from '@/components/landing';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Index' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export default async function Page() {
  const { userId } = await clerkAuth();

  if (userId) {
    redirect('/dashboard');
  }

  setRequestLocale(await getLocale());

  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </>
  );
}
