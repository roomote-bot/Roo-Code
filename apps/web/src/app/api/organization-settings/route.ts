import { NextRequest, NextResponse } from 'next/server';

import { authorizeApi } from '@/actions/auth';
import { getOrganizationSettingsByOrgId } from '@/lib/server/organizationSettings';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApi(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized request' },
        { status: 401 },
      );
    }

    const settings = await getOrganizationSettingsByOrgId(authResult.orgId);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching organization settings:', error);

    return NextResponse.json(
      { error: 'Failed to fetch organization settings' },
      { status: 500 },
    );
  }
}
