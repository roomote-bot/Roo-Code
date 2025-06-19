'use client';

import { useCallback } from 'react';
import { useSessionStorage, useMount } from 'react-use';
import { useSearchParams } from 'next/navigation';

import { AuthStateParam, type AuthState } from '@/types';
import { EXTENSION_URI_SCHEME } from '@/lib/constants';

export const useAuthState = () => {
  const searchParams = useSearchParams();

  const [state, setState] = useSessionStorage<string | undefined>(
    AuthStateParam.State,
    searchParams.get(AuthStateParam.State) ?? undefined,
  );

  const [authRedirect, setAuthRedirect] = useSessionStorage<string | undefined>(
    AuthStateParam.AuthRedirect,
    searchParams.get(AuthStateParam.AuthRedirect) ?? undefined,
  );

  const set = useCallback(
    (state: AuthState) => {
      setState(state.state);
      setAuthRedirect(state.authRedirect);
    },
    [setState, setAuthRedirect],
  );

  const params = state
    ? new URLSearchParams({
        [AuthStateParam.State]: state,
        [AuthStateParam.AuthRedirect]: authRedirect ?? EXTENSION_URI_SCHEME,
      })
    : undefined;

  const authState: AuthState = {
    state,
    authRedirect,
    params,
  };

  return { ...authState, set };
};

export const useSetAuthState = () => {
  const { state, authRedirect = EXTENSION_URI_SCHEME, set } = useAuthState();

  useMount(() => {
    if (state) {
      set({ state, authRedirect });
    }
  });
};
