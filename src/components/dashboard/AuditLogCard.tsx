'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import { AuditLogDetails } from './AuditLogDetails';
import { AuditLogEntry } from './AuditLogEntry';
import type { AuditLogType } from '@/db/schema';
import { getAuditLogs } from '@/actions/auditLogs';

export function AuditLogCard() {
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);
  const { organization } = useOrganization();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', organization?.id, 5],
    queryFn: async () =>
      await getAuditLogs({ orgId: organization?.id, limit: 5 }),
    enabled: !!organization?.id,
  });

  const handleLogClick = (log: AuditLogType) => setSelectedLog(log);
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
