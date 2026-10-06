import { env } from 'cloudflare:workers';
import { database, stateRow, operational, migrateLegacyEvents } from '../../../lib/store';
import { identify, authorize, HttpError } from '../../../lib/access';

export async function GET(request: Request) {
  try {
    const db = database(env);
    const user = await identify(request, db, env.ADMIN_EMAILS || '');
    authorize(user.role, 'backup');
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const row = await db
        .prepare('SELECT data FROM backups WHERE id=?')
        .bind(id)
        .first<{ data: string }>();
      if (!row) throw new HttpError(404, 'Backup não encontrado.');
      return Response.json(JSON.parse(row.data), { headers: { 'Cache-Control': 'no-store' } });
    }
    const row = await stateRow(db);
    await migrateLegacyEvents(db, row.state);
    const audit = await db
      .prepare('SELECT COUNT(*) AS total FROM ledger')
      .first<{ total: number }>();
    return Response.json(
      {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        revision: row.revision,
        state: operational(row.state),
        auditRecords: audit?.total || 0,
        auditExport: 'CSV disponível em Relatórios; a auditoria é preservada na restauração.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: 'Falha ao exportar. Tente novamente.' }, { status: 503 });
  }
}
