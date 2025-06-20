'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import type { AuditLogWithUser } from '@roo-code-cloud/db';

import { type TimePeriod, timePeriods } from '@/types';
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
  const { orgId } = useAuth();
  const limit = 20;
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(7);

  const { data: logs = [], isPending } = useQuery({
    queryKey: ['getAuditLogs', orgId, limit, timePeriod],
    queryFn: () => getAuditLogs({ orgId, limit, timePeriod }),
    enabled: !!orgId,
  });

  const [selectedLog, setSelectedLog] = useState<AuditLogWithUser | null>(null);

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
              logs.map((log: AuditLogWithUser) => (
                <AuditLogEntry
                  key={log.id}
                  log={log}
                  onClick={(log: AuditLogWithUser) => setSelectedLog(log)}
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
