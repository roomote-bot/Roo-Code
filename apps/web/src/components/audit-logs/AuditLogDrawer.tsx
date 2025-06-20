import type { AuditLogWithUser } from '@roo-code-cloud/db';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui';
import { AuditLogDetails } from '@/components/audit-logs';

type AuditLogDrawerProps = {
  selectedLog: AuditLogWithUser | null;
  onClose: () => void;
};

export const AuditLogDrawer = ({
  selectedLog,
  onClose,
}: AuditLogDrawerProps) => {
  return (
    <Drawer open={!!selectedLog} onClose={onClose} direction="right">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Activity Details</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          {selectedLog && <AuditLogDetails log={selectedLog} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
