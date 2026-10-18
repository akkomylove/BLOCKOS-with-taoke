import { NextResponse } from 'next/server';
import { getUserId } from './auth-utils';
import { getAccountMode } from './account';

export function withEnterprise<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    let id: string;
    try { id = await getUserId(args[0] instanceof Request ? args[0] : undefined); }
    catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    try {
      if (await getAccountMode(id) !== 'enterprise') {
        return NextResponse.json({ error: '此功能仅在企业模式下可用，请在账号中心切换模式', code: 'ENTERPRISE_MODE_REQUIRED' }, { status: 403 });
      }
      return await handler(...args);
    } catch (err) {
      console.error('Enterprise endpoint failed:', err);
      return NextResponse.json({ error: '服务暂时不可用，请稍后重试' }, { status: 500 });
    }
  };
}
