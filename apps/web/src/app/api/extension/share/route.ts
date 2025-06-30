import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createTaskShare } from '@/actions/taskSharing';
import { getTasks } from '@/actions/analytics';
import { getOrganizationSettings } from '@/actions/organizationSettings';
import { authorize } from '@/actions/auth';
import { TaskShareVisibility } from '@/types/task-sharing';

const createShareRequestSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  visibility: z
    .nativeEnum(TaskShareVisibility)
    .default(TaskShareVisibility.ORGANIZATION),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize();

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { userId, orgId } = authResult;

    const body = await request.json();
    const result = createShareRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 },
      );
    }

    const { taskId, visibility } = result.data;

    // Check if task sharing is enabled for the organization
    const orgSettings = await getOrganizationSettings();

    if (!orgSettings.cloudSettings?.enableTaskSharing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task sharing is not enabled for this organization',
        },
        { status: 403 },
      );
    }

    // Verify user has access to the task
    const tasksResult = await getTasks({ orgId, userId, taskId });

    if (tasksResult.tasks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found or access denied' },
        { status: 404 },
      );
    }

    const shareResponse = await createTaskShare({ taskId, visibility });

    if (!shareResponse.success || !shareResponse.data) {
      return NextResponse.json(
        {
          success: false,
          error: shareResponse.error || 'Failed to create share link',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      shareUrl: shareResponse.data.shareUrl,
    });
  } catch (error) {
    console.error('Error in extension share endpoint:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
