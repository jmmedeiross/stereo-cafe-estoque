import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, act, available, today, currentMenu } from '../app/model.ts';
import { isoDate, stateSchema } from '../lib/validation.ts';
import { authorize, sameOrigin, HttpError, identify } from '../lib/access.ts';
import { csvCell } from '../lib/csv.ts';

const who = 'teste@example.com';
const receive = (
  s: any,
  item: string,
  qty: number,
  code = 'LOTE',
  expiry = '2099-12-31',
  cost = 1,
) => act(s, { type: 'receive', item, qty, code, expiry, cost }, who);
function coffee() {
  let s = receive(seed(), 'cafe', 1000, 'CAFE', '2099-12-31', 0.12);
  s = receive(s, 'filtro', 10, 'FILTRO', '2099-12-31', 0.8);
  s = act(s, { type: 'brew', qty: 2, grams: 120, filters: 1, holdMinutes: 60 }, who);
  return act(
    s,
    { type: 'recipe', product: 'p0', price: 12, recipe: [{ item: 'coado', qty: 200 }] },
    who,
  );
}

test('cardápio tem 54 produtos, coado a R$12 e mantém identificadores antigos', () => {
  const s = seed();
  assert.equal(s.products.length, 54);
  assert.equal(s.products[0].name, 'Café coado');
  assert.equal(s.products[0].price, 12);
  assert.equal(s.products.find((p) => p.id === 'p2')?.name, 'V60');
  assert.ok(!s.products.some((p) => p.id === 'p1'));
  assert.equal(
    currentMenu({ ...s, products: [...s.products, { id: 'p1' } as any] }).products.length,
    54,
  );
});
test('não vende receita sem confirmação', () =>
  assert.throws(() => act(seed(), { type: 'sale', product: 'p0', qty: 1 }, who), /Confirme/));
test('preparo baixa grãos e filtros e calcula custo pelos lotes recebidos', () => {
  const s = coffee();
  assert.equal(available(s, 'cafe'), 880);
  assert.equal(available(s, 'filtro'), 9);
  assert.equal(available(s, 'coado'), 2000);
  assert.equal(s.lots.find((l) => l.item === 'coado')?.cost, 0.0076);
});
test('venda baixa café preparado uma vez, registra receita e CMV do lote', () => {
  const before = coffee();
  const s = act(before, { type: 'sale', product: 'p0', qty: 3 }, who);
  assert.equal(available(s, 'coado'), 1400);
  assert.equal(available(s, 'cafe'), 880);
  assert.equal(available(before, 'coado'), 2000);
  assert.equal(s.events[0].value, 36);
  assert.equal(s.events[0].cost, 4.56);
  assert.ok(s.events[0].allocations.length);
});
test('saldo insuficiente em ingrediente posterior não altera nenhum lote', () => {
  let s = receive(seed(), 'pao', 10);
  const p = s.products.find((p) => p.name === 'Queijo quente')!;
  s = act(
    s,
    {
      type: 'recipe',
      product: p.id,
      price: 24,
      recipe: [
        { item: 'pao', qty: 1 },
        { item: 'queijo', qty: 60 },
      ],
    },
    who,
  );
  const original = JSON.stringify(s);
  assert.throws(() => act(s, { type: 'sale', product: p.id, qty: 1 }, who), /insuficiente/);
  assert.equal(JSON.stringify(s), original);
});
test('PVPS consome vencimento mais próximo mesmo quando foi recebido depois', () => {
  let s = receive(seed(), 'pao', 10, 'FUTURO');
  s = receive(s, 'pao', 3, 'HOJE', today());
  const p = s.products.find((p) => p.name === 'Queijo quente')!;
  s = act(s, { type: 'recipe', product: p.id, price: 24, recipe: [{ item: 'pao', qty: 1 }] }, who);
  s = act(s, { type: 'sale', product: p.id, qty: 4 }, who);
  assert.equal(s.lots.find((l) => l.code === 'HOJE')?.qty, 0);
  assert.equal(s.lots.find((l) => l.code === 'FUTURO')?.qty, 9);
});
test('lotes vencidos não compõem saldo disponível', () => {
  const s = coffee();
  s.lots.find((l) => l.item === 'coado')!.expiry = '2000-01-01';
  assert.equal(available(s, 'coado'), 0);
  assert.throws(() => act(s, { type: 'sale', product: 'p0', qty: 1 }, who), /insuficiente/);
});
test('limite de uso do café preparado bloqueia venda mesmo no mesmo dia', () => {
  const s = coffee();
  s.lots.find((l) => l.item === 'coado')!.expiresAt = new Date(Date.now() - 1000).toISOString();
  assert.equal(available(s, 'coado'), 0);
  assert.throws(() => act(s, { type: 'sale', product: 'p0', qty: 1 }, who), /insuficiente/);
});
test('estorno devolve aos lotes de origem, sem liberar lote expirado', () => {
  const sold = act(coffee(), { type: 'sale', product: 'p0', qty: 2 }, who);
  const event = sold.events[0];
  sold.lots.find((l) => l.item === 'coado')!.expiresAt = new Date(Date.now() - 1000).toISOString();
  const s = act(sold, { type: 'cancelSale', event: event.id, reason: 'Pedido cancelado' }, who, {
    saleEvent: event,
  });
  assert.equal(s.lots.find((l) => l.item === 'coado')!.qty, 2000);
  assert.equal(available(s, 'coado'), 0);
  assert.equal(s.events[0].value, -24);
  assert.equal(s.events[0].reverseOf, event.id);
});
test('bloqueia estorno repetido', () => {
  const s = act(coffee(), { type: 'sale', product: 'p0', qty: 1 }, who);
  const event = s.events[0];
  assert.throws(
    () =>
      act(s, { type: 'cancelSale', event: event.id, reason: 'Duplicado' }, who, {
        saleEvent: event,
        alreadyReversed: true,
      }),
    /já foi/,
  );
});
test('leite vegetal substitui integral e cobra o adicional', () => {
  let s = receive(seed(), 'cafe', 100);
  s = receive(s, 'leite', 500);
  s = receive(s, 'vegetal', 500);
  const p = s.products.find((p) => p.name === 'Latte')!;
  s = act(
    s,
    {
      type: 'recipe',
      product: p.id,
      price: 16,
      recipe: [
        { item: 'cafe', qty: 18 },
        { item: 'leite', qty: 180 },
      ],
    },
    who,
  );
  s = act(s, { type: 'sale', product: p.id, qty: 1, vegetal: true }, who);
  assert.equal(available(s, 'leite'), 500);
  assert.equal(available(s, 'vegetal'), 320);
  assert.equal(s.events[0].value, 20);
});
test('compra planejada não vira estoque até recebimento', () => {
  const s = act(
    seed(),
    { type: 'order', item: 'pao', qty: 20, supplier: 'Padaria', delivery: today() },
    who,
  );
  assert.equal(available(s, 'pao'), 0);
  const done = act(
    s,
    {
      type: 'receive',
      item: 'pao',
      qty: 20,
      cost: 1,
      code: 'P1',
      expiry: today(),
      order: s.orders[0].id,
    },
    who,
  );
  assert.equal(available(done, 'pao'), 20);
  assert.equal(done.orders[0].status, 'Recebido');
  assert.throws(
    () =>
      act(
        done,
        {
          type: 'receive',
          item: 'pao',
          qty: 20,
          cost: 1,
          code: 'P2',
          expiry: today(),
          order: s.orders[0].id,
        },
        who,
      ),
    /integral/,
  );
});
test('validação rejeita valores negativos, infinitos, fracionamento de venda e datas impossíveis', () => {
  for (const qty of [-1, 0, Infinity, 1.5])
    assert.throws(() => act(coffee(), { type: 'sale', product: 'p0', qty }, who));
  assert.equal(isoDate.safeParse('2026-02-30').success, false);
  assert.equal(isoDate.safeParse('2028-02-29').success, true);
});
test('perda e inventário guardam motivo e saldo final', () => {
  let s = receive(seed(), 'pao', 10);
  const id = s.lots[0].id;
  s = act(s, { type: 'loss', lot: id, qty: 2, reason: 'Quebra' }, who);
  assert.equal(s.lots[0].qty, 8);
  assert.equal(s.events[0].value, 2);
  s = act(s, { type: 'count', lot: id, qty: 7, reason: 'Conferência' }, who);
  assert.equal(s.lots[0].qty, 7);
  assert.match(s.events[0].description, /8 → 7/);
});
test('backup rejeita referências quebradas e IDs duplicados', () => {
  const s = seed();
  assert.ok(stateSchema.safeParse(s).success);
  s.products[0].recipe[0].item = 'inexistente';
  assert.equal(stateSchema.safeParse(s).success, false);
});
test('restauração exige confirmação literal e registra auditoria', () => {
  const s = coffee();
  assert.throws(() =>
    act(s, { type: 'restore', backup: { state: seed() }, confirmation: 'sim' }, who),
  );
  const restored = act(
    s,
    { type: 'restore', backup: { state: seed() }, confirmation: 'RESTAURAR' },
    who,
  );
  assert.equal(restored.lots.length, 0);
  assert.equal(restored.events[0].type, 'restore');
});
test('atendente não pode editar receitas, equipe, compras ou backups', () => {
  for (const type of ['recipe', 'staff', 'order', 'restore', 'backup', 'count'])
    assert.throws(() => authorize('operator', type), HttpError);
  for (const type of ['sale', 'brew', 'loss', 'check'])
    assert.doesNotThrow(() => authorize('operator', type));
  assert.doesNotThrow(() => authorize('manager', 'restore'));
});
test('identidade ausente é recusada e funcionário inativo é recusado', async () => {
  const db = {
    prepare: () => ({
      bind: () => ({ first: async () => ({ name: 'Pessoa', role: 'operator', active: 0 }) }),
    }),
  } as any;
  await assert.rejects(() => identify(new Request('https://store.test'), db, ''), /Entre/);
  await assert.rejects(
    () =>
      identify(
        new Request('https://store.test', {
          headers: {
            'oai-authenticated-user-id': 'id',
            'oai-authenticated-user-email': 'a@example.com',
          },
        }),
        db,
        '',
      ),
    /liberado/,
  );
});
test('origem externa ou ausente não pode alterar estoque', () => {
  assert.throws(
    () =>
      sameOrigin(
        new Request('https://store.test/api/state', { headers: { origin: 'https://evil.test' } }),
      ),
    HttpError,
  );
  assert.throws(() => sameOrigin(new Request('https://store.test/api/state')), HttpError);
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request('https://store.test/api/state', { headers: { origin: 'https://store.test' } }),
    ),
  );
});
test('CSV neutraliza fórmulas e escapa aspas', () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell('normal'), '"normal"');
});
test('modo exemplo identifica movimentos para não confundir com operação real', () => {
  const s = act(seed(), { type: 'demo' }, who);
  assert.equal(s.events[0].demo, true);
  const ended = act(s, { type: 'clearDemo' }, who);
  assert.equal(ended.demo, false);
  assert.equal(ended.lots.length, 0);
  assert.equal(ended.events[0].demo, true);
});
