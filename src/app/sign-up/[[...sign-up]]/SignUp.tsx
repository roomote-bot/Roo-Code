'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { dark } from '@clerk/themes';
import { SignUp as ClerkSignUp } from '@clerk/nextjs';

import { Logo } from '@/components/layout';

export const SignUp = () => {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === 'dark' ? dark : undefined;

  return (
    <div className="flex flex-col gap-8 h-screen w-full items-center justify-center">
      <Link href="/">
        <Logo />
      </Link>
      <ClerkSignUp appearance={{ baseTheme }} />
    </div>
  );
};
