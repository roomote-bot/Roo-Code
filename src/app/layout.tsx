import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { auth } from '@clerk/nextjs/server';

import { getClerkLocale } from '@/i18n/locale';
import { syncAuth } from '@/lib/server/sync';
import { Toaster } from '@/components/ui';
import {
  ThemeProvider,
  AuthProvider,
  ReactQueryProvider,
} from '@/components/layout';

import './globals.css';

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

  syncAuth(await auth());

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
