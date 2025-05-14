'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { dark } from '@clerk/themes';
import { SignIn as ClerkSignIn } from '@clerk/nextjs';

import { Logo } from '@/components/layout';

export const SignIn = () => {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;
  const searchParams = useSearchParams();

  const forceRedirectUrl = useMemo(() => {
    const state = searchParams.get('state');
    return state ? `/extension/sign-in?state=${state}` : undefined;
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-8 h-screen w-full items-center justify-center">
      <Link href="/">
        <Logo />
      </Link>
      <ClerkSignIn
        appearance={{ baseTheme }}
        forceRedirectUrl={forceRedirectUrl}
      />
    </div>
  );
};
