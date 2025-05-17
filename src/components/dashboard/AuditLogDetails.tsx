'use client';

import { ArrowRight, Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { AuditLogTargetType, type AuditLogType } from '@/db/schema';
import { getBaseUrl } from '@/lib/metadata';

type AuditLogDetailsProps = {
  log: AuditLogType;
};

const getSettingsUrl = (type: AuditLogTargetType): string => {
  const baseUrl = `${getBaseUrl()}/dashboard/org`;
  switch (type) {
    case AuditLogTargetType.MEMBER_CHANGE:
      return `${baseUrl}/organization-members`;
    case AuditLogTargetType.PROVIDER_WHITELIST:
      return `${baseUrl}/provider-whitelist`;
    case AuditLogTargetType.DEFAULT_PARAMETERS:
      return `${baseUrl}/default-parameters`;
    default:
      return baseUrl;
  }
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
          <span>{log.createdAt.toLocaleDateString()}</span>
          <Clock className="ml-2 size-4" />
          <span>{log.createdAt.toLocaleTimeString()}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <User className="size-4" />
          <span>{log.userId}</span>
        </div>

        <Link
          href={getSettingsUrl(log.targetType)}
          className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          View in settings
          <ArrowRight className="ml-1 size-4" />
        </Link>
      </div>

      {/* Change details */}
      <div className="rounded-md border p-4">
        <h3 className="mb-4 text-sm font-medium">Changes</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase text-muted-foreground">
              New Value
            </h4>
            <div className="rounded-md bg-muted p-3">
              {formatValue(log.newValue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
