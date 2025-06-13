import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { AuditLogs } from './AuditLogs';

export default async function Page() {
  const { orgRole } = await auth();

  // Only admins can access audit logs
  if (orgRole !== 'org:admin') {
    redirect('/usage');
  }

  return <AuditLogs />;
}
