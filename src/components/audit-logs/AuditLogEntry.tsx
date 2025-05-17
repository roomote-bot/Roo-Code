import { Settings, Sliders, Users } from 'lucide-react';
import { formatDistance } from 'date-fns';

import { type AuditLogType, AuditLogTargetType } from '@/db/schema';
import { cn } from '@/lib/utils';

type AuditLogEntryProps = {
  log: AuditLogType;
  onClick: (log: AuditLogType) => void;
};

const getIconByType = (type: AuditLogTargetType) => {
  switch (type) {
    case AuditLogTargetType.PROVIDER_WHITELIST:
      return <Settings className="size-4 text-purple-500" />;
    case AuditLogTargetType.DEFAULT_PARAMETERS:
      return <Sliders className="size-4 text-green-500" />;
    case AuditLogTargetType.MEMBER_CHANGE:
      return <Users className="size-4 text-amber-500" />;
    default:
      return <Settings className="size-4 text-gray-500" />;
  }
};

export const AuditLogEntry = ({ log, onClick }: AuditLogEntryProps) => (
  <button
    onClick={() => onClick(log)}
    className={cn(
      'w-full rounded-md p-3 text-left transition-colors',
      'hover:bg-muted focus:bg-muted focus:outline-none',
    )}
  >
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{getIconByType(log.targetType)}</div>
      <div className="flex-1 space-y-1">
        <p className="text-sm text-foreground">{log.description}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{log.userId}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistance(log.createdAt, new Date(), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  </button>
);
