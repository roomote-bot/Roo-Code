import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { getOrganizationSettings } from '@/actions/organizationSettings';

export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized request' },
        { status: 401 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const settings = await getOrganizationSettings();

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization settings' },
      { status: 500 },
    );
  }
}
