import { redirect } from 'next/navigation';
import { auth as clerkAuth } from '@clerk/nextjs/server';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await clerkAuth();

  if (!auth.userId) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      {children}
    </div>
  );
}
