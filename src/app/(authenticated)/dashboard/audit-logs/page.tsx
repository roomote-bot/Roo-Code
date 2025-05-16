'use client';

import { useState } from 'react';

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
import type { AuditLog } from '@/components/dashboard/mockAuditLogs';
import { getFilteredLogs } from '@/components/dashboard/mockAuditLogs';

type TimePeriod = '7' | '30' | '90';

const AuditLogsPage = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const logs = getFilteredLogs(Number(timePeriod));

  const handleLogClick = (log: AuditLog) => setSelectedLog(log);
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
          {logs.length > 0 ? (
            logs.map((log: AuditLog) => (
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
