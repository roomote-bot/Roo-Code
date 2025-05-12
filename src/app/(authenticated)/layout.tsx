import { redirect } from 'next/navigation';
import { auth as clerkAuth } from '@clerk/nextjs/server';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await clerkAuth();

  if (!auth.userId) {
    redirect('/');
  }

  return children;
}
