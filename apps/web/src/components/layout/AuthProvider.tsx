'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

import { getClerkLocale } from '@/i18n/locale';
import { SentryUserContext } from './SentryUserContext';
import { useTheme } from 'next-themes';

type Localization = ReturnType<typeof getClerkLocale>;

export const AuthProvider = ({
  localization,
  children,
}: {
  localization: Localization;
  children: React.ReactNode;
}) => {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;

  return (
    <ClerkProvider
      appearance={{ baseTheme }}
      localization={localization}
      afterSignOutUrl={'/sign-in'}
    >
      <SentryUserContext />
      {children}
    </ClerkProvider>
  );
};
