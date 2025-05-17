'use client';

import { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import type { AuditLogType } from '@/db/schema';
import { timePeriods, type TimePeriod } from '@/schemas';
import { getAuditLogs } from '@/actions/auditLogs';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui';
import { AuditLogDetails } from '@/components/audit-logs/AuditLogDetails';
import { AuditLogEntry } from '@/components/audit-logs/AuditLogEntry';

export const AuditLogs = () => {
  const { organization } = useOrganization();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(7);
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', organization?.id, timePeriod],
    queryFn: () =>
      getAuditLogs({
        orgId: organization?.id,
        limit: 20,
        nRecentDays: timePeriod,
      }),
    enabled: !!organization?.id,
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Activity</CardTitle>
          <CardDescription>
            Showing all audit logs for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex space-x-2">
            {timePeriods.map((period) => (
              <Button
                key={period}
                variant={timePeriod === period ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setTimePeriod(period)}
              >
                Last {period} days
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            {isLoading ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : logs.length > 0 ? (
              logs.map((log: AuditLogType) => (
                <AuditLogEntry
                  key={log.id}
                  log={log}
                  onClick={(log: AuditLogType) => setSelectedLog(log)}
                />
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No activity found
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Drawer open={!!selectedLog} onClose={() => setSelectedLog(null)}>
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
