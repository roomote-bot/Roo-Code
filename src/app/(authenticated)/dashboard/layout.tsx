import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardHeader />
      <div className="min-h-[calc(100vh-72px)] bg-muted">
        <div className="max-w-screen-lg mx-auto px-4 pb-16 pt-6">
          {children}
        </div>
      </div>
    </>
  );
}
