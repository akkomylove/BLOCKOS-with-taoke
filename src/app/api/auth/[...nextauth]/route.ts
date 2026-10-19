import { withDatabaseRequest } from '@/lib/database-request';
import { handlers } from '@/lib/auth';

export const GET = withDatabaseRequest(handlers.GET);
export const POST = withDatabaseRequest(handlers.POST);
