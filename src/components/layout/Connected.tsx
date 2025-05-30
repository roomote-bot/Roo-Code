import { UserButton } from '@clerk/nextjs';

import { Logo } from './Logo';
import { ThemeSwitcher } from './ThemeSwitcher';

export const Connected = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex flex-col gap-8">You are connected to Roo Code.</div>
    <div className="absolute top-8 left-8">
      <Logo />
    </div>
    <div className="absolute top-8 right-8">
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <UserButton />
      </div>
    </div>
  </div>
);
