import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  const configuredKey = process.env.HEALTH_CHECK_KEY;
  const isAuthorized = !configuredKey || apiKey === configuredKey;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '7.0.0-enterprise',
      environment: process.env.NODE_ENV || 'production',
      services: {
        api: 'ok',
      },
    },
    { status: 200 },
  );
}
