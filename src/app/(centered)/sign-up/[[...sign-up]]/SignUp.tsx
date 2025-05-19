'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignUp as ClerkSignUp } from '@clerk/nextjs';

export const SignUp = () => {
  const searchParams = useSearchParams();

  const forceRedirectUrl = useMemo(() => {
    const state = searchParams.get('state');
    return state ? `/extension/sign-in?state=${state}` : undefined;
  }, [searchParams]);

  return <ClerkSignUp forceRedirectUrl={forceRedirectUrl} />;
};
