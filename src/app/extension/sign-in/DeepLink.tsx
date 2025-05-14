'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Button, Card, CardContent, CardFooter } from '@/components/ui';
import { Logo } from '@/components/layout';

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
    <div className="flex flex-col justify-center gap-4 max-w-md h-screen mx-auto">
      <Link href="/" className="text-center">
        <Logo />
      </Link>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            You&apos;ve successfully authenticated. We&apos;re attempting to
            open VSCode with your credentials.
          </div>
          <div className="flex flex-row justify-between gap-4">
            <Button variant="outline" className="flex-1" asChild>
              <Link href={vsCodeUrl}>Open in VSCode</Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link href={cursorUrl}>Open in Cursor</Link>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          {redirectAttempted
            ? 'You can close this window after VSCode opens.'
            : 'Redirecting automatically...'}
        </CardFooter>
      </Card>
    </div>
  );
};
