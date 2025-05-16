import { cookies } from 'next/headers';
import { isLocale } from '@/i18n/locale';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async (params) => {
  const requestLocale = await params.requestLocale;

  const locale = isLocale(requestLocale)
    ? requestLocale
    : ((await cookies()).get('locale')?.value ?? 'en');

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});
