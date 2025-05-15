import '@/styles/globals.css';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { ClerkProvider } from '@clerk/nextjs';

import { getClerkLocale } from '@/lib/locale';
import { ThemeProvider } from '@/components/layout';
import { ToastProvider, ToastViewport } from '@/components/ui/toast';
import { ToastProvider as ToastContextProvider } from '@/components/ui/toast-context';
import { Toaster } from '@/components/ui/toaster';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className="bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ClerkProvider localization={getClerkLocale(locale)}>
              <ToastProvider>
                <ToastContextProvider>
                  {children}
                  <Toaster />
                  <ToastViewport />
                </ToastContextProvider>
              </ToastProvider>
            </ClerkProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
