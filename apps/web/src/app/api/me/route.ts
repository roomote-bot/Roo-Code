import { NextRequest, NextResponse } from 'next/server';

import { authorizeApi } from '@/actions/auth';

export async function GET(request: NextRequest) {
  const authResult = await authorizeApi(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: 'Unauthorized request' },
      { status: 401 },
    );
  }

  return NextResponse.json(authResult);
}
