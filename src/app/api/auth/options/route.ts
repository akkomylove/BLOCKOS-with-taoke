import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    demo: process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_LOGIN === 'true',
    providers: [
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? ['github'] : []),
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? ['google'] : []),
    ],
  });
}
