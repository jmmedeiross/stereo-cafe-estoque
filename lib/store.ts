import { currentMenu, seed, today, type State } from '../app/model.ts';

export function database(env: { DB?: D1Database }) {
  if (!env.DB) throw new Error('Database binding unavailable');
  return env.DB;
}
export function operational(s: State) {
  return { ...s, events: [], checks: s.checks.slice(-500) };
}
export function businessDay(ts: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts));
}

export async function stateRow(db: D1Database) {
  const row = await db
    .prepare('SELECT revision,data FROM cafe_state WHERE id=?')
    .bind('cafe')
    .first<{ revision: number; data: string }>();
  return { revision: row?.revision || 0, state: row ? currentMenu(JSON.parse(row.data)) : seed() };
}

export async function migrateLegacyEvents(db: D1Database, s: State) {
  for (let offset = 0; offset < s.events.length; offset += 40) {
    const statements = s.events
      .slice(offset, offset + 40)
      .map((e) =>
        db
          .prepare(
            'INSERT OR IGNORE INTO ledger (id,ts,business_day,type,actor,data) VALUES (?,?,?,?,?,?)',
          )
          .bind(e.id, e.ts, businessDay(e.ts), e.type, e.actor, JSON.stringify(e)),
      );
    if (statements.length) await db.batch(statements);
  }
}

export async function history(db: D1Database, limit = 200, before?: string) {
  const query = before
    ? db
        .prepare('SELECT id,data FROM ledger WHERE (ts || id) < ? ORDER BY ts DESC,id DESC LIMIT ?')
        .bind(before, limit)
    : db.prepare('SELECT id,data FROM ledger ORDER BY ts DESC,id DESC LIMIT ?').bind(limit);
  const result = await query.all<{ id: string; data: string }>();
  return result.results.map((row) => JSON.parse(row.data));
}

export async function responseData(db: D1Database, user: any) {
  const row = await stateRow(db);
  await migrateLegacyEvents(db, row.state);
  const events = await history(db);
  // Today's totals must include every sale, even after the first 200 entries.
  const todayRows = await db
    .prepare('SELECT data FROM ledger WHERE business_day=? ORDER BY ts DESC,id DESC')
    .bind(today())
    .all<{ data: string }>();
  const totals = todayRows.results
    .map((r) => JSON.parse(r.data))
    .reduce(
      (a, e) => {
        if (e.demo) return a;
        if (['sale', 'cancelSale'].includes(e.type)) a.sales += e.value;
        if (e.type === 'loss') a.losses += e.value;
        a.count++;
        return a;
      },
      { sales: 0, losses: 0, count: 0 },
    );
  const count = await db.prepare('SELECT COUNT(*) AS total FROM ledger').first<{ total: number }>();
  const staff =
    user.role === 'manager'
      ? (await db.prepare('SELECT email,name,role,active FROM staff ORDER BY name').all()).results
      : [];
  return {
    ...row,
    state: { ...row.state, events },
    user,
    totals,
    totalEvents: count?.total || 0,
    staff,
  };
}

export async function allHistory(db: D1Database) {
  let events: any[] = [],
    before: string | undefined;
  for (;;) {
    const page = await history(db, 500, before);
    events.push(...page);
    if (page.length < 500) break;
    const last = page.at(-1);
    before = last.ts + last.id;
    if (events.length > 100000) throw new Error('Export too large; use database export');
  }
  return events;
}
