import { NextRequest } from 'next/server';
import { POST as runImpact } from '../../../ai-impact/route';

export async function GET(
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

export async function POST(
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
