'use client';

import { useTheme } from 'next-themes';
import { dark } from '@clerk/themes';
import { UserProfile as ClerkUserProfile } from '@clerk/nextjs';

export const UserProfile = () => {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;

  return (
    <ClerkUserProfile
      appearance={{ baseTheme }}
      routing="path"
      path="/dashboard/user"
    />
  );
};
