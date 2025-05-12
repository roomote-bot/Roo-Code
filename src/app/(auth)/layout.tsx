'use client';

import { enUS, frFR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';

export default function AuthLayout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let clerkLocale = enUS;

  if (props.params.locale === 'fr') {
    clerkLocale = frFR;
  }

  return (
    <ClerkProvider
      localization={clerkLocale}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
    >
      {props.children}
    </ClerkProvider>
  );
}
