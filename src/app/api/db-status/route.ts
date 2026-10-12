import { NextResponse } from 'next/server';
import { getDb, getDbStatus } from '@/lib/db';

export async function GET() {
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
