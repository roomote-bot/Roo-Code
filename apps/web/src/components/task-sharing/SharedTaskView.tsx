import type { TaskWithUser, Message } from '@/actions/analytics';
import type { SharedByUser } from '@/types/task-sharing';
import { TaskDetails } from './TaskDetails';

type SharedTaskViewProps = {
  task: TaskWithUser;
  messages: Message[];
  sharedBy: SharedByUser;
  sharedAt: Date;
};

export const SharedTaskView = ({
  task,
  messages,
  sharedBy,
  sharedAt,
}: SharedTaskViewProps) => {
  return (
    <TaskDetails
      task={task}
      messages={messages}
      sharedBy={sharedBy}
      sharedAt={sharedAt}
      showSharedInfo={true}
    />
  );
};
