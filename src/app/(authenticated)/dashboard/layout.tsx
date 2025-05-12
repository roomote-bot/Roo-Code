import { getLocale, getTranslations } from 'next-intl/server';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="shadow-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-3 py-4">
          <DashboardHeader />
        </div>
      </div>
      <div className="min-h-[calc(100vh-72px)] bg-muted">
        <div className="mx-auto max-w-screen-xl px-3 pb-16 pt-6">
          {children}
        </div>
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';
