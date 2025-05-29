'use client';

import { useCallback } from 'react';
import { useSessionStorage, useMount } from 'react-use';
import { useSearchParams } from 'next/navigation';

import { EXTENSION_URL } from '@/lib/constants';

export type AuthState = {
  state?: string;
  ide?: string;
};

export type SetAuthState = (state: AuthState) => void;

export const useAuthState = (): AuthState & { set: SetAuthState } => {
  const [state, setState] = useSessionStorage<string | undefined>('state');
  const [ide, setIde] = useSessionStorage<string | undefined>('ide');

  const set = useCallback(
    (state: AuthState) => {
      setState(state.state);
      setIde(state.ide);
    },
    [setState, setIde],
  );

  return { state, ide, set };
};

export const useSetAuthState = () => {
  const { set } = useAuthState();
  const searchParams = useSearchParams();

  useMount(() => {
    const state = searchParams.get('state');
    const ide = searchParams.get('ide');

    if (state) {
      set({ state, ide: ide ?? EXTENSION_URL });
    }
  });
};
