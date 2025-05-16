import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    return redirect('/sign-in');
  }

  return children;
}
