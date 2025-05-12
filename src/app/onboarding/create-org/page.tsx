import { redirect } from 'next/navigation';
import { CreateOrganization } from '@clerk/nextjs';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { getLocale, getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export const dynamic = 'force-dynamic';

export default async function Page() {
  const auth = await clerkAuth();

  if (!auth.userId) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <CreateOrganization
        // afterSelectOrganizationUrl="/dashboard"
        afterCreateOrganizationUrl="/dashboard"
      />
    </div>
  );
}
