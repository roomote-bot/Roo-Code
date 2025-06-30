import { notFound, redirect } from 'next/navigation';

import { getTaskByShareToken } from '@/actions/taskSharing';
import { SharedTaskView } from '@/components/task-sharing/SharedTaskView';
import { Badge } from '@/components/ui';

type SharedTaskPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function SharedTaskPage({ params }: SharedTaskPageProps) {
  try {
    const { token } = await params;
    const result = await getTaskByShareToken(token);

    if (!result) {
      notFound();
    }

    const { task, messages, sharedBy, sharedAt, visibility } = result;

    return (
      <div className="container mx-auto py-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Shared Task</span>
            {visibility === 'public' && (
              <Badge variant="secondary">Public</Badge>
            )}
          </div>
        </div>
        <SharedTaskView
          task={task}
          messages={messages}
          sharedBy={sharedBy}
          sharedAt={sharedAt}
          shareToken={token}
        />
      </div>
    );
  } catch (error) {
    // Handle auth errors for org shares
    if (
      error instanceof Error &&
      error.message.includes('Authentication required')
    ) {
      // For organization shares that require auth, redirect to sign-in
      const { token } = await params;
      redirect(
        `/sign-in?redirect_url=${encodeURIComponent(`/share/${token}`)}`,
      );
    }

    notFound();
  }
}

export async function generateMetadata({ params }: SharedTaskPageProps) {
  try {
    const { token } = await params;
    const result = await getTaskByShareToken(token);

    if (!result) {
      return {
        title: 'Shared Task Not Found',
      };
    }

    const { task, visibility } = result;
    const title = task.title || `Task by ${task.user.name}`;

    return {
      title: `Shared Task: ${title}`,
      description: `View shared task details and conversation history${
        visibility === 'public' ? ' (Public)' : ''
      }`,
    };
  } catch (_error) {
    return {
      title: 'Shared Task',
    };
  }
}
