import { env } from 'cloudflare:workers';
import { ZodError } from 'zod';
import { act } from '../../model';
import { identify, authorize, sameOrigin, HttpError } from '../../../lib/access';
import { mutationSchema } from '../../../lib/validation';
import {
  database,
  operational,
  stateRow,
  responseData,
  migrateLegacyEvents,
  businessDay,
} from '../../../lib/store';

export async function GET(request: Request) {
  try {
    const db = database(env);
    const user = await identify(request, db, env.ADMIN_EMAILS || '');
    return Response.json(await responseData(db, user), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const db = database(env);
    const user = await identify(request, db, env.ADMIN_EMAILS || '');
    if (Number(request.headers.get('content-length') || 0) > 10000000)
      throw new HttpError(413, 'O arquivo excede 10 MB.');
    const raw = await request.text();
    if (raw.length > 10000000) throw new HttpError(413, 'O arquivo excede 10 MB.');
    const body = mutationSchema.parse(JSON.parse(raw));
    authorize(user.role, body.action.type);
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(JSON.stringify(body.action) + user.email),
        ),
      ),
    )
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
    const previous = await db
      .prepare('SELECT digest FROM operations WHERE id=?')
      .bind(body.operationId)
      .first<{ digest: string }>();
    if (previous) {
      if (previous.digest !== digest)
        throw new HttpError(
          409,
          'O identificador deste registro já foi usado para outra operação.',
        );
      return Response.json({ ...(await responseData(db, user)), replayed: true });
    }
    const row = await stateRow(db);
    if (row.revision !== body.revision)
      throw new HttpError(
        409,
        'O estoque foi atualizado por outra pessoa. Atualize e confira antes de salvar novamente.',
      );
    await migrateLegacyEvents(db, row.state);
    if (
      body.action.type === 'demo' &&
      (await db.prepare('SELECT COUNT(*) AS total FROM ledger').first<{ total: number }>())?.total
    )
      throw new HttpError(400, 'O exemplo só pode ser iniciado antes do primeiro movimento.');
    let saleEvent: any,
      alreadyReversed = false;
    if (body.action.type === 'cancelSale') {
      const sale = await db
        .prepare('SELECT data FROM ledger WHERE id=?')
        .bind(body.action.event)
        .first<{ data: string }>();
      saleEvent = sale ? JSON.parse(sale.data) : undefined;
      alreadyReversed = !!(await db
        .prepare('SELECT id FROM ledger WHERE reverse_of=?')
        .bind(body.action.event)
        .first());
    }
    let next;
    try {
      next = act(row.state, body.action, user.email, { saleEvent, alreadyReversed });
    } catch (e) {
      if (e instanceof ZodError) throw e;
      throw new HttpError(400, e instanceof Error ? e.message : 'Confira os dados.');
    }
    const event = next.events[0];
    const newRevision = row.revision + 1;
    await db
      .prepare('INSERT OR IGNORE INTO cafe_state (id,revision,data) VALUES (?,0,?)')
      .bind('cafe', JSON.stringify(operational(row.state)))
      .run();
    const timestamp = new Date().toISOString();
    const day = businessDay(timestamp);
    const statements = [
      db
        .prepare(
          'UPDATE cafe_state SET revision=?,data=?,last_operation=? WHERE id=? AND revision=?',
        )
        .bind(
          newRevision,
          JSON.stringify(operational(next)),
          body.operationId,
          'cafe',
          row.revision,
        ),
      db
        .prepare(
          'INSERT INTO operations (id,digest,revision,created_at) SELECT ?,?,?,? FROM cafe_state WHERE id=? AND last_operation=? AND revision=?',
        )
        .bind(
          body.operationId,
          digest,
          newRevision,
          timestamp,
          'cafe',
          body.operationId,
          newRevision,
        ),
      db
        .prepare(
          'INSERT INTO ledger (id,ts,business_day,type,actor,data,reverse_of) SELECT ?,?,?,?,?,?,? FROM cafe_state WHERE id=? AND last_operation=? AND revision=?',
        )
        .bind(
          event.id,
          event.ts,
          businessDay(event.ts),
          event.type,
          event.actor,
          JSON.stringify(event),
          event.reverseOf || null,
          'cafe',
          body.operationId,
          newRevision,
        ),
      // Snapshot once per business day, immediately before its first successful mutation.
      db
        .prepare(
          'INSERT OR IGNORE INTO backups (id,created_at,actor,data) SELECT ?,?,?,? FROM cafe_state WHERE id=? AND last_operation=? AND revision=?',
        )
        .bind(
          'daily-' + day,
          timestamp,
          user.email,
          JSON.stringify({ schemaVersion: 2, state: operational(row.state) }),
          'cafe',
          body.operationId,
          newRevision,
        ),
    ];
    if (body.action.type === 'restore')
      statements.push(
        db
          .prepare(
            'INSERT INTO backups (id,created_at,actor,data) SELECT ?,?,?,? FROM cafe_state WHERE id=? AND last_operation=? AND revision=?',
          )
          .bind(
            'before-restore-' + body.operationId,
            timestamp,
            user.email,
            JSON.stringify({ schemaVersion: 2, state: operational(row.state) }),
            'cafe',
            body.operationId,
            newRevision,
          ),
      );
    if (body.action.type === 'staff') {
      const a = body.action;
      const admins = (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase());
      if (admins.includes(a.email))
        throw new HttpError(400, 'O administrador inicial é configurado na hospedagem.');
      statements.push(
        db
          .prepare(
            'INSERT INTO staff (email,name,role,active) SELECT ?,?,?,? FROM cafe_state WHERE id=? AND last_operation=? AND revision=? ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,active=excluded.active',
          )
          .bind(a.email, a.name, a.role, a.active ? 1 : 0, 'cafe', body.operationId, newRevision),
      );
    }
    let results;
    try {
      results = await db.batch(statements);
    } catch (e) {
      const retry = await db
        .prepare('SELECT digest FROM operations WHERE id=?')
        .bind(body.operationId)
        .first<{ digest: string }>();
      if (retry?.digest === digest)
        return Response.json({ ...(await responseData(db, user)), replayed: true });
      if (String(e).includes('idx_ledger_reverse_of') || String(e).includes('ledger.reverse_of'))
        throw new HttpError(409, 'A venda já foi estornada por outra pessoa.');
      throw e;
    }
    if (!results[0].meta.changes)
      throw new HttpError(
        409,
        'O estoque mudou durante a operação. Atualize e confira antes de tentar novamente.',
      );
    return Response.json(await responseData(db, user));
  } catch (e) {
    return failure(e);
  }
}

function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      {
        error:
          'Confira os campos: ' +
          error.issues
            .slice(0, 3)
            .map((e) => e.path.join('.'))
            .join(', '),
      },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return Response.json(
      { error: 'O arquivo ou registro contém dados inválidos.' },
      { status: 400 },
    );
  console.error('stock_request_failed', error);
  return Response.json(
    {
      error:
        'Não foi possível acessar o armazenamento. Seus dados do formulário foram mantidos; tente novamente.',
    },
    { status: 503 },
  );
}
