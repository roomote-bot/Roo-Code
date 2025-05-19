'use client';

import { useSessionStorage, useMount } from 'react-use';
import { useSearchParams } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  const searchParams = useSearchParams();
  const [, setState] = useSessionStorage<string | undefined>('state');

  useMount(() => {
    const state = searchParams.get('state');

    if (state) {
      setState(state);
    }
  });

  return <SignIn />;
}
