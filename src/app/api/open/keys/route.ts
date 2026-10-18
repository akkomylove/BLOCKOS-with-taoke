import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { generateApiKey, listApiKeys, revokeApiKey } from '@/lib/api-keys';

export async function GET(req: NextRequest) {
  if (req.headers.has('authorization')) return NextResponse.json({ error: '请使用账号登录会话管理 API Key' }, { status: 403 });
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await listApiKeys(userId);
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('GET /api/open/keys error:', error);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.has('authorization')) return NextResponse.json({ error: '请使用账号登录会话管理 API Key' }, { status: 403 });
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || 'External Agent Key').trim();
    const permissions = Array.isArray(body.permissions) ? body.permissions : ['read', 'write'];
    const ttlDays = typeof body.ttlDays === 'number' ? body.ttlDays : 90;

    const result = await generateApiKey(userId, name, permissions, ttlDays);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/open/keys error:', error);
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (req.headers.has('authorization')) return NextResponse.json({ error: '请使用账号登录会话管理 API Key' }, { status: 403 });
  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const keyId = url.searchParams.get('id');
    if (!keyId) {
      return NextResponse.json({ error: 'Missing key id' }, { status: 400 });
    }

    await revokeApiKey(keyId, userId);
    return NextResponse.json({ success: true, revokedId: keyId });
  } catch (error) {
    console.error('DELETE /api/open/keys error:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
