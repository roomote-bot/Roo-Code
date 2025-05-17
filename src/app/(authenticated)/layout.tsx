import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { NavbarHeader, NavbarMenu, Section } from '@/components/layout';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = await auth();

  if (!orgId) {
    redirect('/onboarding/select-org');
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
