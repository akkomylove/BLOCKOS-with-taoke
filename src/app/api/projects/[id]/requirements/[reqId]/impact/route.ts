import { withDatabaseRequest } from '@/lib/database-request';
import { withEnterprise } from '@/lib/enterprise-access';
import { NextRequest } from 'next/server';
import { POST as runImpact } from '../../../ai-impact/route';

async function GETHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  const { id, reqId } = await params;
  const dummyReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ requirementId: reqId }),
  });
  return runImpact(dummyReq, { params: Promise.resolve({ id }) });
}

async function POSTHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  const { id, reqId } = await params;
  const body = await req.json().catch(() => ({}));
  const dummyReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ ...body, requirementId: reqId }),
  });
  return runImpact(dummyReq, { params: Promise.resolve({ id }) });
}

export const GET = withDatabaseRequest(withEnterprise(GETHandler));
export const POST = withDatabaseRequest(withEnterprise(POSTHandler));
