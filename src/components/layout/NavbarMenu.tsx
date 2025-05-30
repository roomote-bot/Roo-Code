'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/ecosystem';

import { Section } from './Section';

type NavbarMenuProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>;

const tabValues = [
  '/dashboard',
  '/usage',
  '/audit-logs',
  '/providers',
  '/telemetry',
  '/org',
  '/hidden',
] as const;

type TabValue = (typeof tabValues)[number];

const isTabValue = (value: string): value is TabValue =>
  tabValues.includes(value as TabValue);

export const NavbarMenu = (props: NavbarMenuProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [tabValue, setTabValue] = useState<TabValue | undefined>(undefined);

  useEffect(() => {
    setTabValue(isTabValue(pathname) ? pathname : '/hidden');
  }, [pathname]);

  return (
    <Section {...props}>
      <div className="flex justify-between items-center h-full">
        <div className="flex items-center gap-2">
          <Tabs
            onValueChange={(value) => {
              if (isTabValue(value)) {
                setTabValue(value);

                if (value !== '/hidden') {
                  router.push(value);
                }
              }
            }}
            value={tabValue}
          >
            <TabsList>
              <TabsTrigger value="/dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="/usage">Usage</TabsTrigger>
              <TabsTrigger value="/audit-logs">Audit Logs</TabsTrigger>
              <TabsTrigger value="/providers">Providers</TabsTrigger>
              <TabsTrigger value="/telemetry">Telemetry</TabsTrigger>
              <TabsTrigger value="/org">Organization</TabsTrigger>
              <TabsTrigger value="/hidden" className="hidden" />
            </TabsList>
          </Tabs>
        </div>
      </div>
    </Section>
  );
};
