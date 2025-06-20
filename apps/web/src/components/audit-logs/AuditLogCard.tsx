'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';

import type { AuditLogWithUser } from '@roo-code-cloud/db';

import { getAuditLogs } from '@/actions/auditLogs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
} from '@/components/ui';
import { Button as EnhancedButton } from '@/components/ui/ecosystem';
import { AuditLogEntry } from '@/components/audit-logs';

import { AuditLogDrawer } from './AuditLogDrawer';

export function AuditLogCard() {
  const { orgId } = useAuth();
  const limit = 5;
  const timePeriod = undefined;

  const { data: logs = [], isPending } = useQuery({
    queryKey: ['auditLogs', orgId, limit, timePeriod],
    queryFn: () => getAuditLogs({ orgId, limit, timePeriod }),
    enabled: !!orgId,
  });

  const [selectedLog, setSelectedLog] = useState<AuditLogWithUser | null>(null);
  const path = usePathname();

  return (
    <>
      <Card>
        <CardHeader className="relative">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Organization audit logs and changes</CardDescription>
          {path !== '/audit-logs' && (
            <EnhancedButton
              variant="ghost"
              size="sm"
              effect="expandIcon"
              icon={ArrowRightIcon}
              iconPlacement="right"
              className="absolute top-0 right-6"
              asChild
            >
              <Link
                href="/audit-logs"
                className="text-sm text-primary hover:underline"
              >
                See all logs
              </Link>
            </EnhancedButton>
          )}
        </CardHeader>
        <CardContent>
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
                No recent activity.
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
}
