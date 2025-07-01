'use client';

import { useQuery } from '@tanstack/react-query';

import type { TaskWithUser, Message } from '@/actions/analytics';
import type { SharedByUser } from '@/types/task-sharing';
import { getSharedTaskMessages } from '@/actions/taskSharing';
import { useRealtimePolling } from '@/hooks/useRealtimePolling';
import { TaskDetails } from './TaskDetails';

type SharedTaskViewProps = {
  task: TaskWithUser;
  messages: Message[];
  sharedBy: SharedByUser;
  sharedAt: Date;
  shareToken?: string;
};

export const SharedTaskView = ({
  task,
  messages: initialMessages,
  sharedBy,
  sharedAt,
  shareToken,
}: SharedTaskViewProps) => {
  const polling = useRealtimePolling({
    enabled: !!task.taskId,
    interval: 3000,
  });

  // Poll for updated messages for shared tasks
  const { data: messages = initialMessages } = useQuery({
    queryKey: ['shared-messages', task.taskId, shareToken],
    queryFn: () => {
      if (!shareToken) {
        throw new Error(
          'Share token is required for polling shared task messages',
        );
      }
      return getSharedTaskMessages(shareToken);
    },
    initialData: initialMessages,
    enabled: !!task.taskId && !!shareToken,
    ...polling,
  });

  return (
    <TaskDetails
      task={task}
      messages={messages}
      sharedBy={sharedBy}
      sharedAt={sharedAt}
      showSharedInfo={true}
      enableMessageLinks={true}
      shareToken={shareToken}
    />
  );
};
