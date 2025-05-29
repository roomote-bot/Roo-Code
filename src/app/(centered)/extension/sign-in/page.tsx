import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { getSignInToken } from '@/actions/auth';
import { EXTENSION_EDITOR, EXTENSION_URL } from '@/lib/constants';

import { DeepLink } from './DeepLink';

type Props = {
  searchParams: Promise<{ state?: string; ide?: string }>;
};

export default async function Page(props: Props) {
  const { state, ide } = await props.searchParams;

  if (!state) {
    redirect(`/sign-in`);
  }

  const { userId, orgId } = await auth();

  const code = userId
    ? await getSignInToken(userId).catch(() => undefined)
    : undefined;

  if (!code) {
    redirect(`/sign-in?state=${state}&ide=${ide}`);
  }

  if (!orgId) {
    redirect(`/select-org/${state}?ide=${ide}`);
  }

  let editor;
  let deepLinkUrl;

  try {
    const params = new URLSearchParams({ state, code });

    deepLinkUrl = new URL(
      `/auth/clerk/callback?${params.toString()}`,
      ide ?? EXTENSION_URL,
    ).toString();

    editor = new URL(deepLinkUrl).protocol.slice(0, -1);
  } catch (_) {
    // Use the defaults if we can't parse the URL.
    editor = EXTENSION_EDITOR;
    deepLinkUrl = EXTENSION_URL;
  }

  return <DeepLink editor={editor} deepLinkUrl={deepLinkUrl} />;
}
