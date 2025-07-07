'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useRoomotes } from '@/hooks/useRoomotes';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/ecosystem';

import { Section } from './Section';

type NavbarMenuProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  userRole?: 'admin' | 'member';
};

const tabValues = [
  '/usage',
  '/audit-logs',
  '/providers',
  '/settings',
  '/org',
  '/roomote',
  '/hidden',
] as const;

type TabValue = (typeof tabValues)[number];

const isTabValue = (value: string): value is TabValue =>
  tabValues.includes(value as TabValue);

export const NavbarMenu = ({
  userRole = 'admin',
  ...props
}: NavbarMenuProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [tabValue, setTabValue] = useState<TabValue | undefined>(undefined);
  const roomotes = useRoomotes();

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
              <TabsTrigger value="/usage">Usage</TabsTrigger>
              {userRole === 'admin' && (
                <>
                  <TabsTrigger value="/audit-logs">Audit Logs</TabsTrigger>
                  <TabsTrigger value="/providers">Providers</TabsTrigger>
                  <TabsTrigger value="/settings">Settings</TabsTrigger>
                  <TabsTrigger value="/org">Organization</TabsTrigger>
                </>
              )}
              {roomotes.isEnabled && (
                <TabsTrigger value="/roomote">Roomote</TabsTrigger>
              )}
              <TabsTrigger value="/hidden" className="hidden" />
            </TabsList>
          </Tabs>
        </div>
      </div>
    </Section>
  );
};
