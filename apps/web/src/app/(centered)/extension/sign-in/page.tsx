import { redirect } from 'next/navigation';

import { AuthStateParam } from '@/types';
import { EXTENSION_EDITOR, EXTENSION_URI_SCHEME } from '@/lib/constants';
import { authorize, getSignInToken } from '@/actions/auth';

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

  const authResult = await authorize();
  const userId = authResult.success ? authResult.userId : null;
  const orgId = authResult.success ? authResult.orgId : null;

  const code = userId
    ? await getSignInToken(userId).catch(() => undefined)
    : undefined;

  if (!code) {
    redirect(`/sign-in?${authParams.toString()}`);
  }

  // For personal accounts, orgId will be null - that's okay for extensions
  // Only redirect to select-org if user is not authenticated or not in personal context
  if (!orgId && !(authResult.success && !authResult.orgId)) {
    redirect(`/select-org?${authParams.toString()}`);
  }

  let editor = EXTENSION_EDITOR;
  let editorRedirect = EXTENSION_URI_SCHEME;

  try {
    const params = new URLSearchParams({
      state,
      code,
      ...(orgId && { organizationId: orgId }), // Only include orgId if it exists
    });

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
