import { auth } from '@clerk/nextjs/server';
import { Usage } from './Usage';

export default async function Page() {
  const { userId } = await auth();

  return <Usage userRole="admin" currentUserId={userId} />;
}
