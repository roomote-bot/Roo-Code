'use client';

import { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import type { AuditLog } from '@/db/schema';
import { timePeriods, type TimePeriod } from '@/schemas';
import { getAuditLogs } from '@/actions/auditLogs';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
} from '@/components/ui';
import { AuditLogEntry, AuditLogDrawer } from '@/components/audit-logs';

export const AuditLogs = () => {
  const { organization } = useOrganization();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(7);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs = [], isPending } = useQuery({
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
          <div className="space-y-2">
            {isPending ? (
              <>
                <Skeleton className="h-[64px] w-full" />
                <Skeleton className="h-[64px] w-full" />
                <Skeleton className="h-[64px] w-full" />
              </>
            ) : logs.length > 0 ? (
              logs.map((log: AuditLog) => (
                <AuditLogEntry
                  key={log.id}
                  log={log}
                  onClick={(log: AuditLog) => setSelectedLog(log)}
                />
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                No activity found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <AuditLogDrawer
        selectedLog={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
};
