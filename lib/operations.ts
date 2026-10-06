import { seed, today, available, type State } from '../app/model.ts';
import { actionSchema } from './validation.ts';

export type Allocation = { lot: string; item: string; qty: number; cost: number };
export type Movement = {
  id: string;
  ts: string;
  actor: string;
  type: string;
  description: string;
  value: number;
  cost: number;
  allocations: Allocation[];
  product?: string;
  qty?: number;
  reverseOf?: string;
  demo: boolean;
};

function take(s: State, item: string, qty: number): Allocation[] {
  if (available(s, item) + 1e-7 < qty)
    throw new Error('Estoque válido insuficiente: ' + s.items.find((i) => i.id === item)?.name);
  const used: Allocation[] = [];
  let left = qty;
  for (const lot of s.lots
    .filter(
      (l) =>
        l.item === item &&
        l.expiry >= today() &&
        (!l.expiresAt || l.expiresAt > new Date().toISOString()),
    )
    .sort(
      (a, b) =>
        a.expiry.localeCompare(b.expiry) || (a.expiresAt || '').localeCompare(b.expiresAt || ''),
    )) {
    const n = Math.min(lot.qty, left);
    if (n > 0) {
      lot.qty = Number((lot.qty - n).toFixed(6));
      used.push({ lot: lot.id, item, qty: n, cost: lot.cost });
      left -= n;
    }
    if (left < 1e-7) break;
  }
  return used;
}

export function act(
  original: State,
  input: unknown,
  actor: string,
  context: { saleEvent?: Movement; alreadyReversed?: boolean } = {},
): State {
  const a = actionSchema.parse(input);
  // No partially consumed recipe can leak when a later ingredient fails.
  let s = structuredClone(original);
  const event: Movement = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    actor,
    type: a.type,
    description: '',
    value: 0,
    cost: 0,
    allocations: [],
    demo: original.demo || a.type === 'demo',
  };
  const itemName = (id: string) => s.items.find((i) => i.id === id)?.name || id;

  switch (a.type) {
    case 'demo':
      if (s.events.length || s.lots.length)
        throw new Error('O exemplo está disponível somente antes da primeira operação.');
      s.demo = true;
      s.lots = s.items
        .filter((i) => i.id !== 'coado')
        .map((i) => ({
          id: crypto.randomUUID(),
          item: i.id,
          qty: i.id === 'cafe' ? 6000 : i.target,
          cost: i.cost,
          expiry:
            i.id === 'pao' ? today() : new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
          code: 'EXEMPLO',
          location: i.group,
        }));
      event.description = 'Dados de exemplo carregados';
      break;
    case 'clearDemo':
      if (!s.demo) throw new Error('Operação disponível somente no modo de exemplo.');
      s = seed();
      event.description = 'Modo de exemplo encerrado; estoque reiniciado';
      break;
    case 'receive': {
      const item = s.items.find((i) => i.id === a.item);
      if (!item) throw new Error('Insumo não encontrado.');
      if (a.expiry < today()) throw new Error('Não receba um lote vencido.');
      if (item.unit === 'un' && !Number.isInteger(a.qty))
        throw new Error('Recebimentos em unidade precisam de quantidade inteira.');
      if (a.item === 'coado')
        throw new Error('Use Nova batelada para registrar café coado preparado.');
      if (a.order) {
        const order = s.orders.find((o) => o.id === a.order);
        if (
          !order ||
          order.status !== 'Pendente' ||
          order.item !== a.item ||
          Math.abs(order.qty - a.qty) > 1e-7
        )
          throw new Error('Confira o pedido e receba sua quantidade integral.');
        order.status = 'Recebido';
      }
      s.lots.push({
        id: event.id,
        item: item.id,
        qty: a.qty,
        cost: a.cost,
        expiry: a.expiry,
        code: a.code,
        location: a.location || item.group,
      });
      event.description = `Entrada: ${a.qty} ${item.unit} de ${item.name}`;
      event.value = a.qty * a.cost;
      break;
    }
    case 'sale': {
      const p = s.products.find((p) => p.id === a.product);
      if (!p?.confirmed || !p.recipe.length || p.price <= 0)
        throw new Error('Confirme a receita e o preço antes de vender.');
      const recipe = p.recipe.map((r) => ({ ...r }));
      if (a.vegetal) {
        const milk = recipe.find((r) => r.item === 'leite');
        if (!milk) throw new Error('Esta receita não contém leite integral para substituir.');
        milk.item = 'vegetal';
      }
      const grouped = new Map<string, number>();
      for (const r of recipe) grouped.set(r.item, (grouped.get(r.item) || 0) + r.qty * a.qty);
      for (const [item, qty] of grouped) event.allocations.push(...take(s, item, qty));
      event.description = `Venda: ${a.qty} × ${p.name}${a.vegetal ? ' · leite vegetal' : ''}`;
      event.value = (p.price + (a.vegetal ? 4 : 0)) * a.qty;
      event.product = p.id;
      event.qty = a.qty;
      break;
    }
    case 'brew': {
      event.allocations.push(...take(s, 'cafe', a.grams), ...take(s, 'filtro', a.filters));
      const cost = event.allocations.reduce((n, r) => n + r.qty * r.cost, 0);
      s.lots.push({
        id: event.id,
        item: 'coado',
        qty: a.qty * 1000,
        cost: cost / (a.qty * 1000),
        expiry: today(),
        expiresAt: new Date(Date.now() + a.holdMinutes * 60000).toISOString(),
        code:
          'COADO ' +
          new Date().toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          }),
        location: 'Balcão',
      });
      event.description = `Preparo: ${a.qty} L de coado, ${a.grams} g de café`;
      event.value = cost;
      break;
    }
    case 'loss': {
      const lot = s.lots.find((l) => l.id === a.lot);
      if (!lot || a.qty > lot.qty) throw new Error('Quantidade perdida maior que o saldo do lote.');
      lot.qty = Number((lot.qty - a.qty).toFixed(6));
      event.value = a.qty * lot.cost;
      event.description = `Perda: ${itemName(lot.item)} · ${a.reason}`;
      event.allocations = [{ lot: lot.id, item: lot.item, qty: a.qty, cost: lot.cost }];
      break;
    }
    case 'count': {
      const lot = s.lots.find((l) => l.id === a.lot);
      if (!lot) throw new Error('Lote não encontrado.');
      event.description = `Inventário: ${itemName(lot.item)}, lote ${lot.code}: ${lot.qty} → ${a.qty} · ${a.reason}`;
      lot.qty = a.qty;
      break;
    }
    case 'item': {
      const old = s.items.find((i) => i.id === a.data.id);
      if (old && old.unit !== a.data.unit)
        throw new Error('Crie outro insumo para mudar a unidade.');
      const item = { ...a.data, id: old?.id || event.id };
      s.items = old ? s.items.map((i) => (i.id === old.id ? item : i)) : [...s.items, item];
      event.description = 'Cadastro: ' + item.name;
      break;
    }
    case 'recipe': {
      const p = s.products.find((p) => p.id === a.product);
      if (!p) throw new Error('Produto não encontrado.');
      const seen = new Set<string>();
      for (const r of a.recipe) {
        if (!s.items.some((i) => i.id === r.item) || seen.has(r.item))
          throw new Error('Insumo inválido ou duplicado.');
        seen.add(r.item);
      }
      p.recipe = a.recipe;
      p.price = a.price;
      p.confirmed = true;
      event.description = 'Ficha técnica confirmada: ' + p.name;
      break;
    }
    case 'order':
      if (!s.items.some((i) => i.id === a.item) || a.delivery < today())
        throw new Error('Confira o insumo e a data de entrega.');
      s.orders.push({
        id: event.id,
        item: a.item,
        qty: a.qty,
        supplier: a.supplier,
        delivery: a.delivery,
        status: 'Pendente',
      });
      event.description = 'Compra planejada: ' + itemName(a.item);
      break;
    case 'cancelOrder': {
      const o = s.orders.find((o) => o.id === a.order);
      if (!o || o.status !== 'Pendente') throw new Error('O pedido não está pendente.');
      o.status = 'Cancelado';
      event.description = 'Compra cancelada: ' + itemName(o.item);
      break;
    }
    case 'product':
      s.products.push({
        id: event.id,
        name: a.name,
        category: a.category,
        price: a.price,
        confirmed: false,
        recipe: [],
      });
      event.description = 'Produto cadastrado: ' + a.name;
      break;
    case 'check':
      s.checks.push({ id: event.id, name: a.name, note: a.note, ts: event.ts, actor });
      event.description = 'Rotina: ' + a.name;
      break;
    case 'cancelSale': {
      const sale = context.saleEvent;
      if (!sale || sale.type !== 'sale' || !sale.allocations?.length)
        throw new Error('Esta venda não possui rastreabilidade para estorno automático.');
      if (context.alreadyReversed) throw new Error('Esta venda já foi estornada.');
      for (const r of sale.allocations) {
        const lot = s.lots.find((l) => l.id === r.lot);
        if (!lot) throw new Error('Um lote da venda não existe mais. Faça uma conferência manual.');
        lot.qty = Number((lot.qty + r.qty).toFixed(6));
      }
      event.value = -sale.value;
      event.cost = -(sale.cost || 0);
      event.reverseOf = sale.id;
      event.description = `Estorno: ${sale.description} · ${a.reason}`;
      break;
    }
    case 'restore':
      s = structuredClone(a.backup.state);
      s.products = s.products.filter((p) => p.id !== 'p1');
      s.events = [];
      event.description = 'Backup restaurado pelo gerente; histórico anterior preservado';
      break;
    case 'staff':
      event.description = `Equipe: ${a.name} · ${a.role === 'manager' ? 'gerente' : 'atendente'} · ${a.active ? 'ativo' : 'inativo'}`;
      break;
  }
  if (a.type !== 'cancelSale')
    event.cost = event.allocations.reduce((n, r) => n + r.qty * r.cost, 0);
  event.value = Math.round(event.value * 100) / 100;
  if (event.demo) event.description = '[Exemplo] ' + event.description;
  s.events.unshift(event);
  return s;
}
