import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="shadow-md">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-4 py-4">
          <DashboardHeader />
        </div>
      </div>
      <div className="min-h-[calc(100vh-72px)] bg-muted">
        <div className="mx-auto max-w-screen-lg px-4 pb-16 pt-6">
          {children}
        </div>
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';
