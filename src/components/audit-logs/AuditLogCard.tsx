'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';

import type { AuditLogType } from '@/db/schema';
import { getAuditLogs } from '@/actions/auditLogs';
import {
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
import { Button as EnhancedButton } from '@/components/ui/ecosystem';
import { AuditLogDetails, AuditLogEntry } from '@/components/audit-logs';

export function AuditLogCard() {
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);
  const { organization } = useOrganization();

  const path = usePathname();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', organization?.id, 5],
    queryFn: () => getAuditLogs({ orgId: organization?.id, limit: 5 }),
    enabled: !!organization?.id,
  });

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
                  No recent activity
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
}
