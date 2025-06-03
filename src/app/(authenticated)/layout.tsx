import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { NavbarHeader, NavbarMenu, Section } from '@/components/layout';
import { Usage } from './usage/Usage';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId, orgRole, userId } = await auth();

  if (!orgId) {
    redirect('/select-org');
  }

  // Members get access to usage page only, filtered to their own data
  if (orgRole === 'org:member' || (orgRole && orgRole !== 'org:admin')) {
    return (
      <>
        <NavbarHeader className="h-[72px]" />
        <NavbarMenu className="h-[72px]" userRole="member" />
        <Section divider={false} className="min-h-[calc(100vh-72px-72px-2px)]">
          <div className="flex flex-col gap-8 py-8">
            <Usage userRole="member" currentUserId={userId} />
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <NavbarHeader className="h-[72px]" />
      <NavbarMenu className="h-[72px]" userRole="admin" />
      <Section divider={false} className="min-h-[calc(100vh-72px-72px-2px)]">
        <div className="flex flex-col gap-8 py-8">{children}</div>
      </Section>
    </>
  );
}
