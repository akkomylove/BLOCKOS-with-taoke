import { withDatabaseRequest } from '@/lib/database-request';
import { NextResponse } from 'next/server';
import { getDb, getDbStatus } from '@/lib/db';

async function GETDatabaseHandler() {
  try {
    await getDb();
    const status = await getDbStatus();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(GETDatabaseHandler);
