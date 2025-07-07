import { redirect } from 'next/navigation';

import { authorize } from '@/actions/auth';
import { authorizeRoomotes } from '@/lib/roomotes';

import { Jobs } from './Jobs';

export default async function Page() {
  const authResult = await authorize();

  if (!authResult.success) {
    redirect('/select-org');
  }

  const { success } = await authorizeRoomotes();

  if (!success) {
    redirect('/usage?error=roomotes_not_enabled');
  }

  return (
    <Jobs
      userId={
        authResult.orgRole === 'org:admin' ? undefined : authResult.userId
      }
    />
  );
}
