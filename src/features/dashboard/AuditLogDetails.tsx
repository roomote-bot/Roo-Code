'use client';

import { ArrowRight, Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import type { AuditLog } from './mockAuditLogs';

type AuditLogDetailsProps = {
  log: AuditLog;
};

const formatValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="italic text-muted-foreground">None</span>;
  }

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc pl-5">
        {value.map((item, index) => (
          <li key={index}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="space-y-1">
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="grid grid-cols-2 gap-2">
            <span className="text-sm font-medium">{key}:</span>
            <span className="text-sm">{String(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  return String(value);
};

export function AuditLogDetails({ log }: AuditLogDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Header information */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          <span>{log.timestamp.toLocaleDateString()}</span>
          <Clock className="ml-2 size-4" />
          <span>{log.timestamp.toLocaleTimeString()}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <User className="size-4" />
          <span>{log.user}</span>
        </div>

        {log.path && (
          <Link
            href={log.path}
            className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            View in settings
            <ArrowRight className="ml-1 size-4" />
          </Link>
        )}
      </div>

      {/* Change details */}
      <div className="rounded-md border p-4">
        <h3 className="mb-4 text-sm font-medium">Changes</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase text-muted-foreground">
              Before
            </h4>
            <div className="rounded-md bg-muted p-3">
              {formatValue(log.details.before)}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase text-muted-foreground">
              After
            </h4>
            <div className="rounded-md bg-muted p-3">
              {formatValue(log.details.after)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
