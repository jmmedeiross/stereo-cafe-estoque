import { env } from 'cloudflare:workers';
import { database, history } from '../../../lib/store';
import { identify, HttpError } from '../../../lib/access';
export async function GET(request: Request) {
  try {
    const db = database(env);
    await identify(request, db, env.ADMIN_EMAILS || '');
    const before = new URL(request.url).searchParams.get('before') || undefined;
    if (before && before.length > 100) throw new HttpError(400, 'Cursor inválido');
    return Response.json(
      { events: await history(db, 100, before) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof HttpError ? e.message : 'Falha ao carregar histórico' },
      { status: e instanceof HttpError ? e.status : 503 },
    );
  }
}
