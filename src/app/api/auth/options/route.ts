import { withDatabaseRequest } from '@/lib/database-request';
import { NextResponse } from 'next/server';

async function GETDatabaseHandler() {
  return NextResponse.json({
    demo: process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_LOGIN === 'true',
    providers: [
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? ['github'] : []),
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? ['google'] : []),
    ],
  });
}

export const GET = withDatabaseRequest(GETDatabaseHandler);
