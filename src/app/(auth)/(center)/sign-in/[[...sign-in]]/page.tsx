import { SignIn } from '@clerk/nextjs';
import { getLocale, getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'SignIn' });
  return { title: t('meta_title'), description: t('meta_description') };
}

const SignInPage = () => <SignIn path="/sign-in" />;

export default SignInPage;
