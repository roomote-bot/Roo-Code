import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import {
  NavbarHeader,
  NavbarMenu,
  Section,
  Connected,
} from '@/components/layout';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId, orgRole } = await auth();

  if (!orgId) {
    redirect('/select-org');
  }

  // For now, a non-admin just get a "You're connected" message.
  if (orgRole !== 'org:admin') {
    return <Connected />;
  }

  return (
    <>
      <NavbarHeader className="h-[72px]" />
      <NavbarMenu className="h-[72px]" />
      <Section divider={false} className="min-h-[calc(100vh-72px-72px-2px)]">
        <div className="flex flex-col gap-8 py-8">{children}</div>
      </Section>
    </>
  );
}
