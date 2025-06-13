import { auth } from '@clerk/nextjs/server';
import { Usage } from './Usage';

export default async function Page() {
  const { userId, orgRole } = await auth();

  return (
    <Usage
      userRole={orgRole === 'org:admin' ? 'admin' : 'member'}
      currentUserId={userId}
    />
  );
}
