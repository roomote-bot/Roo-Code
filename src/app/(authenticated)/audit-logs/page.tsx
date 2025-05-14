'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { TitleBar } from '@/components/dashboard/TitleBar';
import { AuditLogDetails } from '@/features/dashboard/AuditLogDetails';
import { AuditLogEntry } from '@/features/dashboard/AuditLogEntry';
import type { AuditLog } from '@/features/dashboard/mockAuditLogs';
import { getFilteredLogs } from '@/features/dashboard/mockAuditLogs';

type TimePeriod = '7' | '30' | '90';

const AuditLogsPage = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get filtered logs based on selected time period
  const logs = getFilteredLogs(Number(timePeriod));

  const handleLogClick = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

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

        {/* Time period toggle */}
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

        {/* Log entries */}
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

      {/* Drawer for log details */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Activity Details"
      >
        {selectedLog && <AuditLogDetails log={selectedLog} />}
      </Drawer>
    </>
  );
};

export default AuditLogsPage;
