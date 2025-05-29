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
  editorRedirect: string;
}

export const DeepLink = ({ editor, editorRedirect }: DeepLinkProps) => {
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    window.location.href = editorRedirect;
    const timer = setTimeout(() => setRedirectAttempted(true), 2000);
    return () => clearTimeout(timer);
  }, [editorRedirect]);

  const ides = useMemo(
    () => [
      {
        editor: 'vscode',
        title: 'Visual Studio Code',
        logo: VSCodeLogo,
        href: editorRedirect.replace(`${editor}://`, 'vscode://'),
      },
      {
        editor: 'vscode-insiders',
        title: 'Visual Studio Code (Insiders)',
        logo: VSCodeInsidersLogo,
        href: editorRedirect.replace(`${editor}://`, 'vscode-insiders://'),
      },
      {
        editor: 'cursor',
        title: 'Cursor',
        logo: CursorLogo,
        href: editorRedirect.replace(`${editor}://`, 'cursor://'),
      },
      {
        editor: 'windsurf',
        title: 'Windsurf',
        logo: WindsurfLogo,
        href: editorRedirect.replace(`${editor}://`, 'windsurf://'),
      },
      {
        editor: 'trae',
        title: 'Trae',
        logo: TraeLogo,
        href: editorRedirect.replace(`${editor}://`, 'trae://'),
      },
    ],
    [editor, editorRedirect],
  );

  const currentIde = ides.find((ide) => ide.editor === editor) ?? ides[0]!;

  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-row justify-center items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Redirecting to {currentIde.title}...
          </div>
          <Link href={editorRedirect} title={currentIde.title}>
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
