import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { Env } from '@/lib/server';
import { getSignInToken } from '@/actions/auth';

import { DeepLink } from './DeepLink';

type Props = {
  searchParams: Promise<{ state?: string }>;
};

export default async function Page(props: Props) {
  const { state } = await props.searchParams;

  if (!state) {
    redirect(`/sign-in`);
  }

  const { userId, orgId } = await auth();
  const code = userId
    ? await getSignInToken(userId).catch(() => undefined)
    : undefined;

  if (!code) {
    redirect(`/sign-in?state=${state}`);
  }

  if (!orgId) {
    redirect(`/select-org/${state}`);
  }

  const searchParams = new URLSearchParams({ state, code });
  const path = `/auth/clerk/callback?${searchParams.toString()}`;
  const vsCodeUrl = new URL(path, Env.VSCODE_EXTENSION_BASE_URL);
  const cursorUrl = new URL(path, Env.CURSOR_EXTENSION_BASE_URL);

  return <DeepLink vsCodeUrl={vsCodeUrl.href} cursorUrl={cursorUrl.href} />;
}
