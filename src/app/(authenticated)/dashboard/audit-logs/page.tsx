'use client';

import { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui';
import { TitleBar } from '@/components/dashboard/TitleBar';
import { AuditLogDetails } from '@/components/dashboard/AuditLogDetails';
import { AuditLogEntry } from '@/components/dashboard/AuditLogEntry';
import type { AuditLogType } from '@/db/schema';
import { getAuditLogs } from '@/actions/auditLogs';

type TimePeriod = '7' | '30' | '90';

const AuditLogsPage = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7');
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);
  const { organization } = useOrganization();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', organization?.id, Number(timePeriod)],
    queryFn: async () =>
      await getAuditLogs({
        orgId: organization?.id,
        limit: 20,
        nRecentDays: Number(timePeriod),
      }),
    enabled: !!organization?.id,
  });

  const handleLogClick = (log: AuditLogType) => setSelectedLog(log);
  const handleCloseDrawer = () => setSelectedLog(null);

  return (
    <>
      <TitleBar
        title="Audit Logs"
        description="View all organization activity and changes"
      />
      <div className="w-2/3 rounded-md bg-card p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">All Activity</h3>
          <p className="text-sm text-muted-foreground">
            Showing all audit logs for your organization
          </p>
        </div>
        <div className="mb-4 flex space-x-2">
          <Button
            variant={timePeriod === '7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('7')}
          >
            Last 7 days
          </Button>
          <Button
            variant={timePeriod === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('30')}
          >
            Last 30 days
          </Button>
          <Button
            variant={timePeriod === '90' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('90')}
          >
            Last 90 days
          </Button>
        </div>
        <div className="space-y-1">
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : logs.length > 0 ? (
            logs.map((log: AuditLogType) => (
              <AuditLogEntry key={log.id} log={log} onClick={handleLogClick} />
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No activity found</p>
            </div>
          )}
        </div>
      </div>
      <Drawer open={!!selectedLog} onClose={handleCloseDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Activity Details</DrawerTitle>
          </DrawerHeader>
          {selectedLog && <AuditLogDetails log={selectedLog} />}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default AuditLogsPage;
