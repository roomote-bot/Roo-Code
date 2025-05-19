'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Card, CardContent, CardFooter } from '@/components/ui';
import { VSCodeLogo } from './VSCodeLogo';
import { CursorLogo } from './CursorLogo';

interface DeepLinkProps {
  vsCodeUrl: string;
  cursorUrl: string;
}

export const DeepLink = ({ vsCodeUrl, cursorUrl }: DeepLinkProps) => {
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    window.location.href = vsCodeUrl;
    const timer = setTimeout(() => setRedirectAttempted(true), 2000);
    return () => clearTimeout(timer);
  }, [vsCodeUrl]);

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="flex flex-col gap-4">
        <div>You&apos;ve successfully authenticated.</div>
        <div className="flex flex-row items-center gap-4">
          <div>Open in your IDE:</div>
          <Link href={vsCodeUrl}>
            <VSCodeLogo />
          </Link>
          <Link href={cursorUrl}>
            <CursorLogo />
          </Link>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {redirectAttempted
          ? 'You can close this window after your IDE opens.'
          : 'Redirecting automatically...'}
      </CardFooter>
    </Card>
  );
};
