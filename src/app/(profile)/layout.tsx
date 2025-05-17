import { Logo } from '@/components/layout';
import { UserButton } from './UserButton';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-8">
        <Logo className="self-center" />
        {children}
      </div>
      <UserButton />
    </div>
  );
}
