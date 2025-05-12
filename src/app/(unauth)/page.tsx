import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

import { Features } from '@/templates/Features';
import { Footer } from '@/templates/Footer';
import { Hero } from '@/templates/Hero';
import { Navbar } from '@/templates/Navbar';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Index' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const IndexPage = async () => {
  const locale = await getLocale();
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </>
  );
};

export default IndexPage;
