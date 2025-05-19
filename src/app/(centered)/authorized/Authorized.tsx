'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { LoaderCircle, CircleCheck, CircleX } from 'lucide-react';

import { Card, CardContent } from '@/components/ui';

export const Authorized = () => {
  const { isSignedIn, orgId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof isSignedIn !== 'undefined' && isLoadingRef.current) {
      isLoadingRef.current = false;
      setTimeout(() => setIsLoading(false), 250);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoading) {
      let path = '/dashboard';

      if (!isSignedIn) {
        path = '/sign-in';
      } else if (!orgId) {
        path = '/select-org';
      }

      setTimeout(() => router.push(path), 1000);
    }
  }, [router, isLoading, isSignedIn, orgId]);

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-row items-center gap-2">
          <div className="font-medium text-sm text-muted-foreground">
            Authenticating
          </div>
          {isLoading ? (
            <LoaderCircle className="animate-spin" />
          ) : isSignedIn ? (
            <CircleCheck className="text-lime-500" />
          ) : (
            <CircleX className="text-rose-500" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
