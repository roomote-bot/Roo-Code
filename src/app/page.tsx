import { redirect } from 'next/navigation';
import { auth as clerkAuth } from '@clerk/nextjs/server';

export default async function Page() {
  const { userId } = await clerkAuth();
  redirect(userId ? '/dashboard' : '/sign-in');
}
