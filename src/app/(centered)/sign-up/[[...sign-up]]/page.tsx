'use client';

import { SignUp } from '@clerk/nextjs';

import { useSetAuthState } from '@/hooks/useAuthState';

export default function Page() {
  useSetAuthState();

  return <SignUp />;
}
