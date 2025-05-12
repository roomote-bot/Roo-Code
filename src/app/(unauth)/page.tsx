import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

import { Features } from '@/components/templates/Features';
import { Footer } from '@/components/templates/Footer';
import { Hero } from '@/components/templates/Hero';
import { Navbar } from '@/components/templates/Navbar';

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
