import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import {
  setSentryUserContext,
  setSentryOrganizationContext,
} from '@/lib/server/sentry-context';
import { NavbarHeader, NavbarMenu, Section } from '@/components/layout';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId, orgRole, userId } = await auth();

  if (!orgId) {
    redirect('/select-org');
  }

  // Set enhanced Sentry context for authenticated users
  if (userId) {
    setSentryUserContext({
      id: userId,
      orgId,
      orgRole,
    });

    if (orgId) {
      setSentryOrganizationContext(orgId, orgRole);
    }
  }

  return (
    <>
      <NavbarHeader className="h-[72px]" />
      <NavbarMenu
        className="h-[72px]"
        userRole={orgRole === 'org:admin' ? 'admin' : 'member'}
      />
      <Section divider={false} className="min-h-[calc(100vh-72px-72px-2px)]">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 py-4 sm:py-6 lg:py-8">
          {children}
        </div>
      </Section>
    </>
  );
}
