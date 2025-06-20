import { formatDistance } from 'date-fns';
import { Settings, Sliders, Users } from 'lucide-react';

import { type AuditLogWithUser, AuditLogTargetType } from '@roo-code-cloud/db';

type AuditLogEntryProps = {
  log: AuditLogWithUser;
  onClick: (log: AuditLogWithUser) => void;
};

export const AuditLogEntry = ({ log, onClick }: AuditLogEntryProps) => (
  <div
    onClick={() => onClick(log)}
    className="rounded-md p-3 transition-colors hover:bg-muted active:opacity-80 cursor-pointer"
  >
    <div className="flex flex-row gap-2">
      <div className="shrink-0 pt-1">{getIconByType(log.targetType)}</div>
      <div className="flex flex-row justify-between items-center gap-2 flex-1">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground">{log.description}</p>
          <p className="text-xs text-muted-foreground">{log.user.name}</p>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {formatDistance(log.createdAt, new Date(), { addSuffix: true })}
        </p>
      </div>
    </div>
  </div>
);

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
