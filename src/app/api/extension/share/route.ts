import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

import { createTaskShare } from '@/actions/taskSharing';
import { getTasks } from '@/actions/analytics';
import { getOrganizationSettings } from '@/actions/organizationSettings';

const createShareRequestSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Use existing Clerk authentication
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const result = createShareRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 },
      );
    }

    const { taskId } = result.data;

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
    const tasks = await getTasks({ orgId, userId });
    const task = tasks.find((t) => t.taskId === taskId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found or access denied' },
        { status: 404 },
      );
    }

    const shareResponse = await createTaskShare({ taskId });

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
