import { auth } from '@clerk/nextjs/server';

import { getUsage } from '@/actions/analytics';

import { Dashboard } from './Dashboard';

export default async function Page() {
  const { orgId } = await auth();
  const usage = await getUsage(orgId);
  return <Dashboard usage={usage} />;
}
