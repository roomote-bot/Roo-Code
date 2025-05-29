'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui';

import { VSCodeLogo } from './VSCodeLogo';
import { VSCodeInsidersLogo } from './VSCodeInsidersLogo';
import { CursorLogo } from './CursorLogo';
import { WindsurfLogo } from './WindsurfLogo';
import { TraeLogo } from './TraeLogo';

interface DeepLinkProps {
  editor: string;
  deepLinkUrl: string;
}

export const DeepLink = ({ editor, deepLinkUrl }: DeepLinkProps) => {
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    window.location.href = deepLinkUrl;
    const timer = setTimeout(() => setRedirectAttempted(true), 2000);
    return () => clearTimeout(timer);
  }, [deepLinkUrl]);

  const ides = useMemo(
    () => [
      {
        editor: 'vscode',
        title: 'Visual Studio Code',
        logo: VSCodeLogo,
        href: deepLinkUrl.replace(`${editor}://`, 'vscode://'),
      },
      {
        editor: 'vscode-insiders',
        title: 'Visual Studio Code (Insiders)',
        logo: VSCodeInsidersLogo,
        href: deepLinkUrl.replace(`${editor}://`, 'vscode-insiders://'),
      },
      {
        editor: 'cursor',
        title: 'Cursor',
        logo: CursorLogo,
        href: deepLinkUrl.replace(`${editor}://`, 'cursor://'),
      },
      {
        editor: 'windsurf',
        title: 'Windsurf',
        logo: WindsurfLogo,
        href: deepLinkUrl.replace(`${editor}://`, 'windsurf://'),
      },
      {
        editor: 'trae',
        title: 'Trae',
        logo: TraeLogo,
        href: deepLinkUrl.replace(`${editor}://`, 'trae://'),
      },
    ],
    [editor, deepLinkUrl],
  );

  const currentIde = ides.find((ide) => ide.editor === editor) ?? ides[0]!;

  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-row justify-center items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Redirecting to {currentIde.title}...
          </div>
          <Link href={deepLinkUrl} title={currentIde.title}>
            <currentIde.logo />
          </Link>
        </div>
        {redirectAttempted && (
          <div className="flex flex-row justify-center items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Or, use another IDE:
            </div>
            {ides.map((ide) => (
              <Link key={ide.editor} href={ide.href} title={ide.title}>
                <ide.logo width={20} height={20} />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
