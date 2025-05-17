'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SignUp as ClerkSignUp } from '@clerk/nextjs';

import { Logo } from '@/components/layout';

export const SignUp = () => {
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
      <ClerkSignUp forceRedirectUrl={forceRedirectUrl} />
    </div>
  );
};
