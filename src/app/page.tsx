import { auth as clerkAuth } from '@clerk/nextjs/server';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

import { Features } from '@/components/templates/Features';
import { Footer } from '@/components/templates/Footer';
import { Hero } from '@/components/templates/Hero';
import { Navbar } from '@/components/templates/Navbar';
import { redirect } from 'next/navigation';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Index' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Page() {
  const auth = await clerkAuth();

  if (auth.userId) {
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
