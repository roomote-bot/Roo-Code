import { redirect } from 'next/navigation';

import { authorize } from '@/actions/auth';

import { AuditLogs } from './AuditLogs';

export default async function Page() {
  const authResult = await authorize();

  // Only admins can access audit logs.
  if (!authResult.success || authResult.orgRole !== 'org:admin') {
    redirect('/usage');
  }

  return <AuditLogs />;
}
