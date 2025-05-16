'use client';

import Link from 'next/link';
import React, { useState } from 'react';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import { AuditLogDetails } from './AuditLogDetails';
import { AuditLogEntry } from './AuditLogEntry';
import type { AuditLog } from './mockAuditLogs';
import { mockAuditLogs } from './mockAuditLogs';

export function AuditLogCard() {
  const logs = mockAuditLogs.slice(0, 5);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const handleLogClick = (log: AuditLog) => setSelectedLog(log);
  const handleCloseDrawer = () => setSelectedLog(null);

  return (
    <div className="mb-6 w-2/3 rounded-md bg-card p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">
          Organization audit logs and changes
        </p>
      </div>

      {/* Log entries */}
      <div className="space-y-1">
        {logs.length > 0 ? (
          logs.map((log: AuditLog) => (
            <AuditLogEntry key={log.id} log={log} onClick={handleLogClick} />
          ))
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )}
      </div>

      {/* "See all logs" link */}
      <div className="mt-4 text-right">
        <Link
          href="/dashboard/audit-logs"
          className="text-sm text-primary hover:underline"
        >
          See all logs
        </Link>
      </div>

      <Drawer open={!!selectedLog} onClose={handleCloseDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Activity Details</DrawerTitle>
          </DrawerHeader>
          {selectedLog && <AuditLogDetails log={selectedLog} />}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
