import { UserButton } from '@clerk/nextjs';

import { Logo, ThemeSwitcher } from '@/components/layout';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-8">{children}</div>
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
}
