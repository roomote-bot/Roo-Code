import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';

import { getClerkLocale } from '@/i18n/locale';
import { syncAuth } from '@/actions/sync';
import { setSentryUserContext } from '@/lib/server/sentry-context';
import { Toaster } from '@/components/ui';
import {
  ThemeProvider,
  AuthProvider,
  ReactQueryProvider,
} from '@/components/layout';

import './globals.css';
import { authorize } from '@/actions/auth';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Index' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    icons: [
      { rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
      { rel: 'icon', url: '/favicon.ico' },
    ],
  };
}

const fontSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const fontMono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  setRequestLocale(locale);

  const authResult = await authorize();

  if (authResult.success) {
    await syncAuth(authResult);

    // Set Sentry user context for server-side error tracking.
    const { userId, orgId, orgRole } = authResult;
    setSentryUserContext({ id: userId, orgId, orgRole });
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider localization={getClerkLocale(locale)}>
              <ReactQueryProvider>
                {children}
                <Toaster />
              </ReactQueryProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
