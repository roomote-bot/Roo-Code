'use client';

import { Settings, Sliders, Users } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

import type { AuditLog, AuditLogType } from './mockAuditLogs';
import { getFormattedTime } from './mockAuditLogs';

type AuditLogEntryProps = {
  log: AuditLog;
  onClick: (log: AuditLog) => void;
};

const getIconByType = (type: AuditLogType) => {
  switch (type) {
    case 'provider_whitelist':
      return <Settings className="size-4 text-purple-500" />;
    case 'default_parameters':
      return <Sliders className="size-4 text-green-500" />;
    case 'member_change':
      return <Users className="size-4 text-amber-500" />;
    default:
      return <Settings className="size-4 text-gray-500" />;
  }
};

export function AuditLogEntry({ log, onClick }: AuditLogEntryProps) {
  return (
    <button
      onClick={() => onClick(log)}
      className={cn(
        'w-full rounded-md p-3 text-left transition-colors',
        'hover:bg-muted focus:bg-muted focus:outline-none',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{getIconByType(log.type)}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm text-foreground">{log.description}</p>

          {/* Summary of changes */}
          <div className="mt-1 text-xs text-muted-foreground">
            {log.type === 'provider_whitelist' && (
              <span>
                {(() => {
                  const before = log.details.before as string[];
                  const after = log.details.after as string[];
                  if (Array.isArray(before) && Array.isArray(after)) {
                    if (after.length > before.length) {
                      const added = after.filter((p) => !before.includes(p));
                      return `Added: ${added.join(', ')}`;
                    } else {
                      const removed = before.filter((p) => !after.includes(p));
                      return `Removed: ${removed.join(', ')}`;
                    }
                  }
                  return '';
                })()}
              </span>
            )}

            {log.type === 'default_parameters' && (
              <span>
                {(() => {
                  const before = log.details.before as Record<string, unknown>;
                  const after = log.details.after as Record<string, unknown>;
                  if (
                    before &&
                    after &&
                    typeof before === 'object' &&
                    typeof after === 'object'
                  ) {
                    return Object.entries(after)
                      .filter(([key, val]) => before[key] !== val)
                      .map(([key, val]) => `${key}: ${before[key]} → ${val}`)
                      .join(', ');
                  }
                  return '';
                })()}
              </span>
            )}

            {log.type === 'member_change' && (
              <span>
                {(() => {
                  if (!log.details.before) {
                    return 'New member added';
                  }
                  if (!log.details.after) {
                    return 'Member removed';
                  }
                  return 'Role updated';
                })()}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{log.user}</p>
            <p className="text-xs text-muted-foreground">
              {getFormattedTime(log.timestamp)}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
