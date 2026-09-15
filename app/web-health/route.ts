import { NextResponse } from 'next/server';

export async function GET() {
  const buildVersion =
    process.env.BUILD_VERSION ||
    process.env.NEXT_PUBLIC_BUILD_VERSION ||
    'development';

  return NextResponse.json(
    {
      status: 'UP',
      service: 'bcost-web',
      buildVersion,
      releaseStage: process.env.NEXT_PUBLIC_RELEASE_STAGE || 'unknown',
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
