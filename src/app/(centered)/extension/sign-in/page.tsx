import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { AuthStateParam } from '@/types';
import { getSignInToken } from '@/actions/auth';
import { EXTENSION_EDITOR, EXTENSION_URI_SCHEME } from '@/lib/constants';

import { DeepLink } from './DeepLink';

type Props = {
  searchParams: Promise<{ state?: string; auth_redirect?: string }>;
};

export default async function Page(props: Props) {
  const { state, auth_redirect: authRedirect = EXTENSION_URI_SCHEME } =
    await props.searchParams;

  if (!state) {
    redirect(`/sign-in`);
  }

  const authParams = new URLSearchParams({
    [AuthStateParam.State]: state,
    [AuthStateParam.AuthRedirect]: authRedirect,
  });

  const { userId, orgId } = await auth();

  const code = userId
    ? await getSignInToken(userId).catch(() => undefined)
    : undefined;

  if (!code) {
    redirect(`/sign-in?${authParams.toString()}`);
  }

  if (!orgId) {
    redirect(`/select-org?${authParams.toString()}`);
  }

  let editor = EXTENSION_EDITOR;
  let editorRedirect = EXTENSION_URI_SCHEME;

  try {
    const params = new URLSearchParams({ state, code });

    editorRedirect = new URL(
      `/auth/clerk/callback?${params.toString()}`,
      authRedirect,
    ).toString();

    editor = new URL(editorRedirect).protocol.slice(0, -1);
  } catch (_) {
    // Use the defaults if we can't parse the URL.
  }

  return <DeepLink editor={editor} editorRedirect={editorRedirect} />;
}
