import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
  throw new Error('Este teste só pode gravar em ambiente local.');
const anonymous = await fetch(origin + '/api/state');
assert.equal(anonymous.status, 401);
const login = await fetch(origin + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
const cookie = login.headers
  .getSetCookie()
  .map((v) => v.split(';')[0])
  .join('; ');
assert.ok(cookie, 'Login local deve retornar cookie');
const headers = { cookie, origin, 'Content-Type': 'application/json' };
const get = async () => {
  const r = await fetch(origin + '/api/state', { headers });
  assert.equal(r.status, 200);
  return r.json();
};
let current = await get();
assert.equal(current.user.role, 'manager');
if (current.state.lots.length || current.totalEvents)
  throw new Error('Use um banco local vazio para este teste de integração.');
async function send(action, revision = current.revision, operationId = crypto.randomUUID()) {
  const body = { revision, operationId, action };
  const r = await fetch(origin + '/api/state', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return { status: r.status, data, body };
}
async function run(action) {
  const r = await send(action);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  current = r.data;
  return r;
}
await run({
  type: 'receive',
  item: 'cafe',
  qty: 1000,
  cost: 0.12,
  code: 'TEST-CAFE',
  expiry: '2099-12-31',
});
await run({
  type: 'receive',
  item: 'filtro',
  qty: 10,
  cost: 0.8,
  code: 'TEST-FILTRO',
  expiry: '2099-12-31',
});
await run({ type: 'brew', qty: 2, grams: 120, filters: 1, holdMinutes: 60 });
await run({ type: 'recipe', product: 'p0', price: 12, recipe: [{ item: 'coado', qty: 200 }] });
const sameRevision = current.revision;
const attempts = await Promise.all([
  send({ type: 'sale', product: 'p0', qty: 1 }, sameRevision),
  send({ type: 'sale', product: 'p0', qty: 1 }, sameRevision),
]);
assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 409]);
const success = attempts.find((r) => r.status === 200);
current = await get();
assert.equal(current.totals.sales, 12);
assert.equal(current.state.lots.find((l) => l.item === 'coado').qty, 1800);
const repeated = await send(success.body.action, success.body.revision, success.body.operationId);
assert.equal(repeated.status, 200);
assert.equal(repeated.data.replayed, true);
assert.equal(repeated.data.totals.sales, 12);
const changed = await send(
  { ...success.body.action, qty: 2 },
  current.revision,
  success.body.operationId,
);
assert.equal(changed.status, 409);
assert.equal(
  (
    await send({
      type: 'receive',
      item: 'cafe',
      qty: 100,
      cost: 0.12,
      code: 'BAD',
      expiry: '2026-02-30',
    })
  ).status,
  400,
);
const external = await fetch(origin + '/api/state', {
  method: 'POST',
  headers: { ...headers, origin: 'https://other.test' },
  body: JSON.stringify({
    revision: current.revision,
    operationId: crypto.randomUUID(),
    action: { type: 'check', name: 'Pico', note: 'Teste' },
  }),
});
assert.equal(external.status, 403);
const sale = current.state.events.find((e) => e.type === 'sale');
await run({ type: 'cancelSale', event: sale.id, reason: 'Teste de integração' });
assert.equal(current.totals.sales, 0);
assert.equal(current.state.lots.find((l) => l.item === 'coado').qty, 2000);
assert.equal((await send({ type: 'cancelSale', event: sale.id, reason: 'Repetido' })).status, 400);
const backups = await (await fetch(origin + '/api/backups', { headers })).json();
assert.ok(backups.backups.length);
const backup = await (await fetch(origin + '/api/backup', { headers })).json();
assert.equal(backup.schemaVersion, 2);
assert.equal(backup.state.products.length, 54);
await run({ type: 'restore', backup, confirmation: 'RESTAURAR' });
assert.ok(current.state.events.some((e) => e.type === 'sale'));
assert.ok(current.state.events.some((e) => e.type === 'restore'));
console.log(
  'PASS: autenticação, persistência, concorrência real, idempotência, validação, origem, estorno e backup/restore.',
);
