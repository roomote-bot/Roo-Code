import { getSignInToken } from '@/lib/server/clerk';
import { Env } from '@/lib/server/env';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authObj = await auth();
  const userId = authObj.userId;
  const state = request.nextUrl.searchParams.get('state') || '';

  if (!userId) {
    throw new Error('not logged in?');
  }

  const signInToken = await getSignInToken(authObj.userId);
  if (!signInToken) {
    throw new Error("couldn't sign in");
  }

  const url = new URL(`${Env.VSCODE_EXTENSION_BASE_URL}/auth/clerk/callback`);
  url.searchParams.append('state', state);
  url.searchParams.append('code', signInToken);
  redirect(url.href);
}
