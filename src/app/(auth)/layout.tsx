'use client';

import { enUS, frFR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import { useLocale } from 'next-intl';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();

  return (
    <ClerkProvider
      localization={locale === 'fr' ? frFR : enUS}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
