'use client';

import { SignIn } from '@clerk/nextjs';

import { useSetAuthState } from '@/hooks/useAuthState';

export default function Page() {
  useSetAuthState();

  return <SignIn />;
}
