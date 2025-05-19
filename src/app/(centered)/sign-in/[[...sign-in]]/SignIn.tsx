'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignIn as ClerkSignIn } from '@clerk/nextjs';

export const SignIn = () => {
  const searchParams = useSearchParams();

  const forceRedirectUrl = useMemo(() => {
    const state = searchParams.get('state');
    return state ? `/extension/sign-in?state=${state}` : undefined;
  }, [searchParams]);

  return <ClerkSignIn forceRedirectUrl={forceRedirectUrl} />;
};
