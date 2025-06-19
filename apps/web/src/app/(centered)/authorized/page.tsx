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
  const authState = useAuthState();

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
        path = authState.params
          ? `/sign-in?${authState.params.toString()}`
          : '/sign-in';
      } else if (!orgId) {
        path = authState.params
          ? `/select-org?${authState.params.toString()}`
          : '/select-org';
      } else {
        path = authState.params
          ? `/extension/sign-in?${authState.params.toString()}`
          : '/usage';
      }

      setTimeout(() => router.push(path), 1000);
    }
  }, [router, isLoading, isSignedIn, orgId, authState.params]);

  return (
    <div className="flex justify-center">
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
