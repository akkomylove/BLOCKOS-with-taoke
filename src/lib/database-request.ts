import { databaseRequest, DatabaseConflict } from './db';

export function withDatabaseRequest<T extends unknown[], R extends Response>(handler: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R | Response> => {
    try { return await databaseRequest(() => handler(...args)); }
    catch (error) {
      console.error('Database request failed:', error instanceof Error ? error.message : 'unknown');
      return Response.json({ error: error instanceof DatabaseConflict ? error.message : '保存服务暂时不可用，请重试；尚未确认保存成功', code: error instanceof DatabaseConflict ? 'DATABASE_CONFLICT' : 'DATABASE_UNAVAILABLE' }, { status: error instanceof DatabaseConflict ? 409 : 503 });
    }
  };
}
