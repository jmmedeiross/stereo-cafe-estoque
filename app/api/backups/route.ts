import { env } from 'cloudflare:workers';
import { database } from '../../../lib/store';
import { identify, authorize, HttpError } from '../../../lib/access';
export async function GET(request: Request) {
  try {
    const db = database(env);
    const user = await identify(request, db, env.ADMIN_EMAILS || '');
    authorize(user.role, 'backup');
    return Response.json(
      {
        backups: (
          await db
            .prepare('SELECT id,created_at,actor FROM backups ORDER BY created_at DESC LIMIT 30')
            .all()
        ).results,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof HttpError ? e.message : 'Falha ao carregar backups' },
      { status: e instanceof HttpError ? e.status : 503 },
    );
  }
}
