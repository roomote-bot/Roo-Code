import { authorize } from '@/actions/auth';

import { Usage } from './Usage';

export default async function Page() {
  const authResult = await authorize();
  const orgRole = authResult.success ? authResult.orgRole : null;
  const userId = authResult.success ? authResult.userId : null;

  return (
    <Usage
      userRole={orgRole === 'org:admin' ? 'admin' : 'member'}
      currentUserId={userId}
    />
  );
}
