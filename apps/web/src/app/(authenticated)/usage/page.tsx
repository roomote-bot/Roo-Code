import { authorize } from '@/actions/auth';

import { Usage } from './Usage';

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const authResult = await authorize();
  const orgRole = authResult.success ? authResult.orgRole : null;
  const userId = authResult.success ? authResult.userId : null;
  const params = await searchParams;

  return (
    <Usage
      userRole={orgRole === 'org:admin' ? 'admin' : 'member'}
      currentUserId={userId}
      error={params.error}
    />
  );
}
