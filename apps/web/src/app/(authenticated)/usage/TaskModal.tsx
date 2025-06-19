import { useQuery } from '@tanstack/react-query';

import type { TaskWithUser } from '@/actions/analytics';
import { getMessages } from '@/actions/analytics';
import { canShareTask } from '@/actions/taskSharing';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { QueryKey } from '@/types/react-query';
import { Dialog, DialogContentLarge } from '@/components/ui';
import { ShareButton } from '@/components/task-sharing/ShareButton';
import { TaskDetails } from '@/components/task-sharing/TaskDetails';

type TaskModalProps = {
  task: TaskWithUser;
  open: boolean;
  onClose: () => void;
};

export const TaskModal = ({ task, open, onClose }: TaskModalProps) => {
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', task.taskId],
    queryFn: () => getMessages(task.taskId),
    enabled: open && !!task.taskId,
  });

  const { data: orgSettings } = useOrganizationSettings();

  const { data: sharePermission } = useQuery({
    queryKey: [QueryKey.CanShareTask, task.taskId],
    queryFn: () => canShareTask(task.taskId),
    enabled: open && !!task.taskId,
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContentLarge>
        <TaskDetails
          task={task}
          messages={messages}
          headerActions={headerActions}
        />
      </DialogContentLarge>
    </Dialog>
  );
};
