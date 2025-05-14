import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { getSignInToken } from '@/lib/server/clerk';
import { Env } from '@/lib/server/env';

import { DeepLink } from './DeepLink';

export default async function Page(params: {
  searchParams: { state?: string };
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const code = await getSignInToken(userId);

  if (!code) {
    redirect('/sign-in');
  }

  const { state = '' } = await params.searchParams;
  const searchParams = new URLSearchParams({ state, code });
  const path = `/auth/clerk/callback?${searchParams.toString()}`;
  const vsCodeUrl = new URL(path, Env.VSCODE_EXTENSION_BASE_URL);
  const cursorUrl = new URL(path, Env.CURSOR_EXTENSION_BASE_URL);

  return <DeepLink vsCodeUrl={vsCodeUrl.href} cursorUrl={cursorUrl.href} />;
}
