import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

export default async function Page() {
  const user = await currentUser().catch(() => null);
  redirect(user !== null ? '/usage' : '/sign-in');
}
