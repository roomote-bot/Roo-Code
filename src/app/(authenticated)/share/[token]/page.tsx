import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { getTaskByShareToken } from '@/actions/taskSharing';
import { SharedTaskView } from '@/components/task-sharing/SharedTaskView';

type SharedTaskPageProps = {
  params: {
    token: string;
  };
};

export default async function SharedTaskPage({ params }: SharedTaskPageProps) {
  const { orgId } = await auth();

  // Redirect to organization selection if no organization
  if (!orgId) {
    redirect('/select-org');
  }

  try {
    const { token } = await params;
    const result = await getTaskByShareToken(token);

    if (!result) {
      notFound();
    }

    const { task, messages, sharedBy, sharedAt } = result;

    return (
      <div className="container mx-auto py-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Shared Task</span>
          </div>
        </div>
        <SharedTaskView
          task={task}
          messages={messages}
          sharedBy={sharedBy}
          sharedAt={sharedAt}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading shared task:', error);

    // Check if it's an access denied error
    if (error instanceof Error && error.message.includes('Access denied')) {
      return (
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Access Denied
            </h1>
            <p className="text-muted-foreground mb-4">
              You must be a member of the organization to view this shared task.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the person who shared this link to ensure you have
              the correct organization access.
            </p>
          </div>
        </div>
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

    const { task } = result;
    const title = task.title || `Task by ${task.user.name}`;

    return {
      title: `Shared Task: ${title}`,
      description: `View shared task details and conversation history`,
    };
  } catch (_error) {
    return {
      title: 'Shared Task',
    };
  }
}
