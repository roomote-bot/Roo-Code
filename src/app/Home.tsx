'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export const Home = () => {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    router.push(isSignedIn ? '/dashboard' : '/sign-in');
  }, [router, isSignedIn]);

  return null;
};
