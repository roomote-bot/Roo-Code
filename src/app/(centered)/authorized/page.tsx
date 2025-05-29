'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { LoaderCircle, CircleCheck, CircleX } from 'lucide-react';

import { useAuthState } from '@/hooks/useAuthState';

export default function Page() {
  const { isSignedIn, orgId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(true);
  const router = useRouter();

  const { state, ide } = useAuthState();

  useEffect(() => {
    if (typeof isSignedIn !== 'undefined' && isLoadingRef.current) {
      isLoadingRef.current = false;
      setTimeout(() => setIsLoading(false), 250);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoading) {
      let path;

      if (!isSignedIn) {
        path = state ? `/sign-in?state=${state}&ide=${ide}` : '/sign-in';
      } else if (!orgId) {
        path = state ? `/select-org/${state}?ide=${ide}` : '/select-org';
      } else {
        path = state
          ? `/extension/sign-in?state=${state}&ide=${ide}`
          : '/dashboard';
      }

      setTimeout(() => router.push(path), 1000);
    }
  }, [router, isLoading, isSignedIn, orgId, state, ide]);

  return (
    <div className="flex flex-row items-center gap-2">
      {isLoading ? (
        <LoaderCircle className="animate-spin" />
      ) : isSignedIn ? (
        <CircleCheck className="text-green-500" />
      ) : (
        <CircleX className="text-rose-500" />
      )}
    </div>
  );
}
