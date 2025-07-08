import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

import type { TaskWithUser } from '@/actions/analytics';
import { getMessages } from '@/actions/analytics';
import { canShareTask } from '@/actions/taskSharing';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useRealtimePolling } from '@/hooks/useRealtimePolling';
import { QueryKey } from '@/types/react-query';
import { Dialog, DialogContentFullScreen } from '@/components/ui';
import { ShareButton } from '@/components/task-sharing/ShareButton';
import { TaskDetails } from '@/components/task-sharing/TaskDetails';

type TaskModalProps = {
  task: TaskWithUser;
  open: boolean;
  onClose: () => void;
};

export const TaskModal = ({ task, open, onClose }: TaskModalProps) => {
  const { orgId, userId } = useAuth();
  const messagePolling = useRealtimePolling({ enabled: open, interval: 2000 });
  const sharePolling = useRealtimePolling({ enabled: open, interval: 5000 });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', task.taskId, orgId, userId],
    queryFn: () => getMessages(task.taskId, orgId, userId),
    enabled: open && !!task.taskId,
    ...messagePolling,
  });

  const { data: orgSettings } = useOrganizationSettings();

  const { data: sharePermission } = useQuery({
    queryKey: [QueryKey.CanShareTask, task.taskId],
    queryFn: () => canShareTask(task.taskId),
    enabled: open && !!task.taskId,
    ...sharePolling,
  });

  const isTaskSharingEnabled =
    orgSettings?.cloudSettings?.enableTaskSharing ?? false;

  const canUserShareThisTask = sharePermission?.canShare ?? false;

  const headerActions = (
    <>
      {isTaskSharingEnabled && canUserShareThisTask && (
        <ShareButton task={task} />
      )}
    </>
  );

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContentFullScreen>
        <TaskDetails
          task={task}
          messages={messages}
          headerActions={headerActions}
        />
      </DialogContentFullScreen>
    </Dialog>
  );
};
