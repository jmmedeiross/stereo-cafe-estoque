'use client';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  Coffee,
  BookOpen,
  ShoppingCart,
  ClipboardCheck,
  ChartNoAxesCombined,
  Settings,
  Plus,
  Search,
  Download,
  RefreshCw,
  X,
  TriangleAlert,
  ArrowUpRight,
  Check,
  Clock,
  Trash2,
} from 'lucide-react';
import Administration from './administration';
import { movementsCsv } from '../lib/csv';
import { State, Item, Product, seed, today, money, available, act } from './model';
const nav = [
  ['Visão geral', LayoutDashboard],
  ['Estoque', Package],
  ['Balcão & preparo', Coffee],
  ['Cardápio & receitas', BookOpen],
  ['Compras', ShoppingCart],
  ['Inventário & perdas', ClipboardCheck],
  ['Relatórios', ChartNoAxesCombined],
  ['Rotinas & método', Settings],
  ['Equipe & backups', Settings],
] as const;
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const date = (s: string) => s.split('-').reverse().join('/');
function exportFile(data: any, name: string, type = 'application/json') {
  const b = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export default function Cafe({ demonstration = false }: { demonstration?: boolean }) {
  const [user, setUser] = useState<any>(null),
    [people, setPeople] = useState<any[]>([]),
    [totals, setTotals] = useState<any>(null),
    [totalEvents, setTotalEvents] = useState(0),
    [online, setOnline] = useState(true);
  const pending = useRef<{ payload: string; id: string } | null>(null);
  function accept(d: any) {
    setS(d.state);
    setRevision(d.revision);
    if (d.user) setUser(d.user);
    setPeople(d.staff || []);
    setTotals(d.totals);
    setTotalEvents(d.totalEvents || d.state.events.length);
  }
  async function downloadBackup() {
    if (demonstration) {
      exportFile({ schemaVersion: 2, state: s }, 'stereo-exemplo.json');
      return;
    }
    try {
      const r = await fetch('/api/backup');
      const data: any = await r.json();
      if (!r.ok) throw Error(data.error);
      exportFile(data, 'stereo-backup-' + today() + '.json');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function downloadMovements() {
    if (demonstration) {
      exportFile(movementsCsv(s.events), 'stereo-exemplo.csv', 'text/csv');
      return;
    }
    try {
      const events: any[] = [];
      let before = '';
      for (;;) {
        const r = await fetch(
          '/api/events' + (before ? '?before=' + encodeURIComponent(before) : ''),
        );
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        events.push(...d.events);
        if (d.events.length < 100) break;
        const last = d.events.at(-1);
        before = last.ts + last.id;
      }
      exportFile(movementsCsv(events), 'stereo-movimentos.csv', 'text/csv');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function moreHistory() {
    if (demonstration) return;
    const last = s.events.at(-1);
    if (!last) return;
    try {
      const r = await fetch('/api/events?before=' + encodeURIComponent(last.ts + last.id));
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setS({ ...s, events: [...s.events, ...d.events] });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const [s, setS] = useState<State>(seed),
    [revision, setRevision] = useState(0),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState('Visão geral'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('Todos'),
    [modal, setModal] = useState<any>(null),
    [form, setForm] = useState<any>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function load() {
    if (demonstration) {
      const demo = act(seed(), { type: 'demo' }, 'Demonstração');
      demo.products.find((p) => p.id === 'p0')!.confirmed = true;
      const brewed = act(
        demo,
        { type: 'brew', qty: 2, grams: 120, filters: 1, holdMinutes: 60 },
        'Demonstração',
      );
      accept({
        state: brewed,
        revision: 0,
        user: { name: 'Visitante', role: 'manager' },
        totals: { sales: 0, losses: 0 },
        staff: [],
      });
      setReady(true);
      return;
    }
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      accept(d);
      setReady(true);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    if (demonstration || modal || busy || !ready) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 20000);
    return () => clearInterval(timer);
  }, [demonstration, modal, busy, ready]);
  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement;
    const el = document.querySelector('.dialog') as HTMLElement;
    const focusable = () =>
      Array.from(
        el.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea',
        ),
      ) as HTMLElement[];
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setModal(null);
      if (e.key === 'Tab') {
        const list = focusable();
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      before?.focus();
    };
  }, [modal, busy]);
  async function save(action: any) {
    if (demonstration) {
      setNotice('Demonstração com dados fictícios; alterações não são salvas.');
      setTimeout(() => setNotice(''), 4000);
      return false;
    }
    if (!navigator.onLine) {
      setError('Sem conexão. O registro não foi enviado.');
      return false;
    }
    setBusy(true);
    const payload = JSON.stringify(action);
    if (!pending.current || pending.current.payload !== payload)
      pending.current = { payload, id: crypto.randomUUID() };
    setError('');
    try {
      const r = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, action, operationId: pending.current.id }),
      });
      const d: any = await r.json();
      if (!r.ok) {
        if (r.status === 409) {
          pending.current = null;
          await load();
        }
        throw Error(d.error);
      }
      accept(d);
      pending.current = null;
      setModal(null);
      setNotice('Registro salvo. Estoque atualizado.');
      setTimeout(() => setNotice(''), 4000);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function open(type: string, data: any = {}) {
    setError('');
    pending.current = null;
    setModal({ type });
    if (type === 'item')
      setForm(
        data.id
          ? { ...data }
          : {
              name: '',
              unit: 'un',
              group: 'Secos',
              cost: 0,
              daily: 0,
              lead: 1,
              safety: 0,
              target: 0,
              supplier: '',
            },
      );
    else if (type === 'recipe')
      setForm({
        product: data.id,
        price: data.price,
        recipe: data.recipe.length
          ? data.recipe.map((r: any) => ({ ...r }))
          : [{ item: s.items[0].id, qty: 1 }],
      });
    else if (type === 'product') setForm({ name: '', category: 'Cafés', price: 0 });
    else if (type === 'brew') setForm({ qty: 2, grams: 120, filters: 1, holdMinutes: 60 });
    else if (type === 'receive')
      setForm({
        item: data.item || s.items[0].id,
        qty: data.qty || 1,
        cost: s.items.find((i) => i.id === data.item)?.cost || s.items[0].cost,
        code: '',
        expiry: today(),
        location: '',
        order: data.id,
      });
    else if (type === 'order') {
      const i = data.id ? data : s.items[0];
      setForm({
        item: i.id,
        qty: Math.max(1, i.target - available(s, i.id)),
        supplier: i.supplier,
        delivery: today(),
      });
    } else
      setForm({
        product: data.id || s.products[0].id,
        qty: 1,
        lot: s.lots.find((l) => l.qty > 0)?.id || '',
        reason: '',
        name: 'Abertura',
        note: '',
      });
  }
  const low = s.items.filter(
    (i) => i.id !== 'coado' && available(s, i.id) <= i.daily * i.lead + i.safety,
  );
  const exp = s.lots.filter(
    (l) => l.qty > 0 && l.expiry <= new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10),
  );
  const stockValue = s.lots.reduce((a, l) => a + l.qty * l.cost, 0),
    eventsToday = s.events.filter(
      (e) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
          new Date(e.ts),
        ) === today(),
    );
  const sales =
      totals?.sales ??
      eventsToday
        .filter((e) => ['sale', 'cancelSale'].includes(e.type))
        .reduce((a, e) => a + e.value, 0),
    losses =
      totals?.losses ??
      eventsToday.filter((e) => e.type === 'loss').reduce((a, e) => a + e.value, 0);
  const f = (key: string, v: any) => setForm({ ...form, [key]: v });
  const field = (key: string, label: string, type = 'text', extra: any = {}) => (
    <label>
      {label}
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={(e) => f(key, e.target.value)}
        required
        {...extra}
      />
    </label>
  );
  const itemSelect = (key = 'item') => (
    <label>
      Insumo
      <select
        value={form[key]}
        onChange={(e) => {
          const i = s.items.find((i) => i.id === e.target.value)!;
          setForm({ ...form, [key]: i.id, ...(modal?.type === 'receive' ? { cost: i.cost } : {}) });
        }}
      >
        {s.items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name} ({i.unit})
          </option>
        ))}
      </select>
    </label>
  );
  const lotSelect = () => (
    <label>
      Lote
      <select value={form.lot} onChange={(e) => f('lot', e.target.value)}>
        {s.lots
          .filter((l) => modal?.type === 'count' || l.qty > 0)
          .map((l) => (
            <option key={l.id} value={l.id}>
              {s.items.find((i) => i.id === l.item)?.name} · {l.code} · {fmt(l.qty)}
            </option>
          ))}
      </select>
    </label>
  );
  const pill = (text: string, kind = '') => <span className={'pill ' + kind}>{text}</span>;
  const itemRows = s.items.filter(
    (i) =>
      (i.name + ' ' + i.supplier).toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'Todos' || (filter === 'Reposição' && low.includes(i)) || i.group === filter),
  );
  const card = (label: string, value: string, sub: string, icon: any) => {
    const Icon = icon;
    return (
      <div className="stat">
        <div className="stat-label">
          {label}
          <Icon size={18} />
        </div>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    );
  };
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <img src="/stereo-logo.jpeg" alt="Logo Stereo Café" />
          </div>
          <div>
            <b>STEREO</b>
            <span>CAFÉ / SÃO PAULO</span>
          </div>
        </div>
        <div className="nav-label">OPERAÇÃO</div>
        <nav>
          {nav
            .filter(([name]) => !demonstration || name !== 'Equipe & backups')
            .filter(
              ([name]) =>
                user?.role !== 'operator' ||
                [
                  'Visão geral',
                  'Estoque',
                  'Balcão & preparo',
                  'Inventário & perdas',
                  'Rotinas & método',
                ].includes(name),
            )
            .map(([name, Icon]) => (
              <button
                key={name}
                className={tab === name ? 'active' : ''}
                onClick={() => {
                  setTab(name);
                  setSearch('');
                  setFilter('Todos');
                }}
              >
                <Icon size={19} />
                {name}
              </button>
            ))}
        </nav>
        <div className="side-bottom">
          <span className="edition">CONTROLE DE ESTOQUE</span>
          <p>
            Bom café.
            <br />
            Operação afinada.
          </p>
          <small>Unidade São Paulo</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Stereo Café <span className="muted">/</span> <b>{tab}</b>
          </span>
          <div>
            <span className="date">{date(today())}</span>
            <button className="icon-btn" aria-label="Atualizar dados" onClick={load}>
              <RefreshCw size={18} />
            </button>
            <span className="session-user">
              {user?.name || 'Stereo Café'}
              <small>
                {user?.role === 'manager'
                  ? 'Gerente'
                  : user?.role === 'operator'
                    ? 'Atendente'
                    : 'Acesso individual'}
              </small>
            </span>
            <a href="/signout-with-chatgpt?return_to=/" target="_top">
              Sair
            </a>
          </div>
        </header>
        <main>
          {!online && (
            <div className="banner danger">
              Sem conexão. Aguarde a internet voltar antes de lançar movimentos.
            </div>
          )}
          {demonstration && (
            <div className="banner">
              <b>Demonstração para portfólio · dados fictícios · alterações não são salvas.</b>
              <a href="/">Abrir loja</a>
            </div>
          )}
          {error && (
            <div role="alert" className="banner danger">
              {error} <button onClick={load}>Tentar novamente</button>
              {!user && (
                <a href="/signin-with-chatgpt?return_to=/" target="_top">
                  Entrar com sua conta
                </a>
              )}
            </div>
          )}
          {notice && (
            <div role="status" className="toast">
              <Check size={18} />
              {notice}
            </div>
          )}
          <div className="title-row">
            <div>
              <p className="eyebrow">
                {tab === 'Visão geral' ? 'NO RITMO DO BALCÃO' : 'STEREO / OPERAÇÃO'}
              </p>
              <h1>{tab === 'Visão geral' ? 'O estoque, em sintonia.' : tab}</h1>
              <p className="muted">
                {tab === 'Visão geral'
                  ? 'Prioridades do dia para manter o café girando.'
                  : tab === 'Estoque'
                    ? 'Insumos, lotes e reposição em um só lugar.'
                    : tab === 'Cardápio & receitas'
                      ? 'Preços do cardápio enviado. Porções estimadas até sua confirmação.'
                      : 'Cada registro mantém o estoque e o histórico atualizados.'}
              </p>
            </div>
            {user?.role === 'manager' && (
              <button
                className="primary"
                disabled={!ready || busy}
                onClick={() => open(tab === 'Compras' ? 'order' : 'receive')}
              >
                <Plus size={18} />
                {tab === 'Compras' ? 'Planejar compra' : 'Registrar entrada'}
              </button>
            )}
          </div>
          {!ready ? (
            <section className="panel">
              <h2>Carregando o estoque…</h2>
              <p>Os dados salvos aparecerão aqui.</p>
            </section>
          ) : (
            <>
              {user?.role === 'manager' && !demonstration && (
                <section className="setup-strip">
                  <b>Preparação da loja</b>
                  <span>
                    {s.products.filter((p) => p.confirmed).length}/{s.products.length} receitas
                    confirmadas
                  </span>
                  <span>{s.lots.length ? 'Estoque cadastrado' : 'Cadastre o estoque real'}</span>
                  <span>{people.filter((p) => p.active).length} funcionários cadastrados</span>
                </section>
              )}
              {s.demo && !demonstration ? (
                <div className="banner">
                  Modo de exemplo · quantidades e custos fictícios.
                  <button onClick={() => open('clearDemo')}>Encerrar exemplo</button>
                </div>
              ) : s.events.length === 0 ? (
                <div className="banner">
                  <div>
                    <b>Pronto para cadastrar seu estoque.</b> Receitas, custos e consumo sugeridos
                    precisam de conferência.
                  </div>
                  <a className="text-btn" href="/demo">
                    Abrir demonstração sem alterar o estoque
                  </a>
                </div>
              ) : null}
              {tab === 'Visão geral' && (
                <>
                  <div className="stats">
                    {card(
                      'Valor em estoque',
                      money(stockValue),
                      'Inclui lotes vencidos ainda não descartados',
                      Package,
                    )}
                    {card(
                      'Precisam de reposição',
                      String(low.length),
                      'Saldo abaixo do ponto de pedido',
                      ShoppingCart,
                    )}
                    {card(
                      'Validade próxima',
                      String(exp.length),
                      'Lotes vencidos ou vencendo em até 2 dias',
                      Clock,
                    )}
                    {card(
                      'Vendas registradas hoje',
                      money(sales),
                      'Total lançado neste programa',
                      Coffee,
                    )}
                  </div>
                  <div className="overview">
                    <section className="rush">
                      <div className="section-head">
                        <span className="eyebrow">PRIORIDADE DO BALCÃO</span>
                        <Coffee size={24} />
                      </div>
                      <h2>Café coado</h2>
                      <p>O mais pedido do cardápio.</p>
                      <div className="rush-grid">
                        {[
                          ['cafe', 'Café em grãos'],
                          ['filtro', 'Filtros de papel'],
                          ['coado', 'Coado pronto'],
                        ].map(([id, name]) => {
                          const i = s.items.find((i) => i.id === id)!;
                          return (
                            <div key={id}>
                              <span>{name}</span>
                              <strong>
                                {fmt(available(s, id))}
                                <small> {i.unit}</small>
                              </strong>
                              <span>
                                {id === 'coado'
                                  ? `${Math.floor(available(s, id) / 200)} copos estimados de 200 ml`
                                  : i.daily
                                    ? `${fmt(available(s, id) / i.daily)} dias de cobertura`
                                    : 'Defina consumo'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="rush-actions">
                        <button onClick={() => open('brew')}>Preparar coado</button>
                        <button
                          onClick={() => {
                            setTab('Balcão & preparo');
                          }}
                        >
                          Abrir balcão
                        </button>
                      </div>
                    </section>
                    <section className="panel">
                      <div className="section-head">
                        <h2>Atenção agora</h2>
                        {pill(`${low.length + exp.length} alertas`, 'warn')}
                      </div>
                      {!low.length && !exp.length ? (
                        <p className="empty">Nenhum alerta no momento.</p>
                      ) : (
                        <div className="alerts">
                          {low.slice(0, 3).map((i) => (
                            <button key={i.id} onClick={() => open('order', i)}>
                              <TriangleAlert size={18} />
                              <div>
                                <b>{i.name}</b>
                                <span>
                                  {fmt(available(s, i.id))} {i.unit} disponíveis · ponto{' '}
                                  {fmt(i.daily * i.lead + i.safety)} {i.unit}
                                </span>
                              </div>
                              <Plus size={16} />
                            </button>
                          ))}
                          {exp.slice(0, 2).map((l) => (
                            <div className="alert-line" key={l.id}>
                              <Clock size={18} />
                              <div>
                                <b>{s.items.find((i) => i.id === l.item)?.name}</b>
                                <span>
                                  Lote {l.code} · {date(l.expiry)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        className="text-btn"
                        onClick={() => {
                          setTab('Estoque');
                          setFilter('Reposição');
                        }}
                      >
                        Ver estoque prioritário
                      </button>
                    </section>
                  </div>
                  <section className="panel">
                    <div className="section-head">
                      <h2>Últimos movimentos</h2>
                      <button className="text-btn" onClick={() => setTab('Relatórios')}>
                        Ver histórico
                      </button>
                    </div>
                    <div className="history">
                      {s.events.slice(0, 5).map((e) => (
                        <div key={e.id}>
                          <span className="event-icon">
                            <Package size={17} />
                          </span>
                          <div>
                            <b>{e.description}</b>
                            <small>
                              {new Date(e.ts).toLocaleString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                              })}{' '}
                              · {e.actor}
                            </small>
                          </div>
                          <strong>{e.value ? money(e.value) : '—'}</strong>
                        </div>
                      ))}
                      {!s.events.length && (
                        <p className="empty">
                          Registre a primeira entrada para iniciar o histórico.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              )}
              {tab === 'Estoque' && (
                <>
                  <div className="toolbar">
                    <label className="search">
                      <Search size={18} />
                      <input
                        placeholder="Buscar insumo ou fornecedor"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filtrar estoque"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {['Todos', 'Reposição', ...new Set(s.items.map((i) => i.group))].map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                    {user?.role === 'manager' && (
                      <button onClick={() => open('item')}>
                        <Plus size={17} />
                        Novo insumo
                      </button>
                    )}
                  </div>
                  <section className="panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th>Saldo válido</th>
                          <th>Cobertura</th>
                          <th>Ponto de pedido</th>
                          <th>Situação</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemRows.map((i) => {
                          const qty = available(s, i.id);
                          return (
                            <tr key={i.id}>
                              <td>
                                <b>{i.name}</b>
                                <small>
                                  {i.group} · {i.supplier || 'Fornecedor a cadastrar'}
                                </small>
                              </td>
                              <td>
                                <b>
                                  {fmt(qty)} {i.unit}
                                </b>
                              </td>
                              <td>{i.daily ? fmt(qty / i.daily) + ' dias' : '—'}</td>
                              <td>
                                {fmt(i.daily * i.lead + i.safety)} {i.unit}
                              </td>
                              <td>
                                {pill(
                                  low.includes(i) ? 'Repor' : 'Disponível',
                                  low.includes(i) ? 'warn' : 'ok',
                                )}
                              </td>
                              <td>
                                {user?.role === 'manager' && (
                                  <button onClick={() => open('item', i)}>Editar</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {!itemRows.length && <p className="empty">Nenhum insumo encontrado.</p>}
                  </section>
                  <section className="panel">
                    <h2>Lotes · primeiro que vence, primeiro que sai</h2>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Insumo / lote</th>
                            <th>Local</th>
                            <th>Saldo</th>
                            <th>Validade</th>
                            <th>Custo unitário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.lots
                            .filter((l) => l.qty > 0)
                            .sort((a, b) => a.expiry.localeCompare(b.expiry))
                            .map((l) => (
                              <tr key={l.id}>
                                <td>
                                  <b>{s.items.find((i) => i.id === l.item)?.name}</b>
                                  <small>{l.code}</small>
                                </td>
                                <td>{l.location}</td>
                                <td>
                                  {fmt(l.qty)} {s.items.find((i) => i.id === l.item)?.unit}
                                </td>
                                <td>
                                  {pill(
                                    l.expiresAt
                                      ? date(l.expiry) +
                                          ' ' +
                                          new Date(l.expiresAt).toLocaleTimeString('pt-BR', {
                                            timeZone: 'America/Sao_Paulo',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                      : date(l.expiry),
                                    l.expiry < today() ||
                                      (l.expiresAt && l.expiresAt < new Date().toISOString())
                                      ? 'bad'
                                      : l.expiry === today()
                                        ? 'warn'
                                        : '',
                                  )}
                                </td>
                                <td>{money(l.cost)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {!s.lots.length && (
                      <p className="empty">Os lotes aparecem após registrar uma entrada.</p>
                    )}
                  </section>
                </>
              )}
              {tab === 'Balcão & preparo' && (
                <>
                  <section className="panel">
                    <div className="section-head">
                      <div>
                        <h2>Preparo do café coado</h2>
                        <p>Baixa grãos e filtros no preparo; baixa o café pronto na venda.</p>
                      </div>
                      <button className="primary" onClick={() => open('brew')}>
                        Nova batelada
                      </button>
                    </div>
                    <div className="brew-note">
                      Disponível: <b>{fmt(available(s, 'coado') / 1000)} L</b> · dentro do limite de
                      uso. Registre a sobra como perda ao encerrar o serviço.
                    </div>
                  </section>
                  <div className="toolbar">
                    <label className="search">
                      <Search size={18} />
                      <input
                        placeholder="Buscar produto"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Categoria"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {['Todos', ...new Set(s.products.map((p) => p.category))].map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="products">
                    {s.products
                      .filter(
                        (p) =>
                          p.name.toLowerCase().includes(search.toLowerCase()) &&
                          (filter === 'Todos' || p.category === filter),
                      )
                      .map((p) => (
                        <button
                          key={p.id}
                          className="product-card"
                          onClick={() =>
                            p.confirmed
                              ? open('sale', p)
                              : user?.role === 'manager'
                                ? open('recipe', p)
                                : setError(
                                    'O gerente precisa confirmar a ficha técnica antes da venda.',
                                  )
                          }
                        >
                          <span>
                            {p.category}
                            {p.id === 'p0' ? pill('Alto giro') : null}
                          </span>
                          <h3>{p.name}</h3>
                          <strong>{p.price ? money(p.price) : 'Preço a confirmar'}</strong>
                          <small>
                            {p.confirmed ? 'Registrar venda' : 'Conferir ficha técnica'}
                          </small>
                        </button>
                      ))}
                  </div>
                </>
              )}
              {tab === 'Cardápio & receitas' && (
                <>
                  <div className="banner">
                    Todas as quantidades iniciais são sugestões. Confirme a porção, os ingredientes
                    e o preço de cada produto para liberar vendas. Na venda, a opção leite vegetal
                    substitui o integral e aplica o adicional de R$ 4.
                  </div>
                  <div className="toolbar">
                    <label className="search">
                      <Search size={18} />
                      <input
                        placeholder="Buscar no cardápio"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <button onClick={() => open('product')}>
                      <Plus size={17} />
                      Novo produto
                    </button>
                  </div>
                  <section className="panel table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Preço</th>
                          <th>Custo teórico</th>
                          <th>CMV teórico</th>
                          <th>Ficha</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.products
                          .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                          .map((p) => {
                            const cost = p.recipe.reduce(
                              (a, r) =>
                                a + r.qty * (s.items.find((i) => i.id === r.item)?.cost || 0),
                              0,
                            );
                            const complete =
                              p.recipe.length > 0 &&
                              p.recipe.every(
                                (r) => (s.items.find((i) => i.id === r.item)?.cost || 0) > 0,
                              );
                            return (
                              <tr key={p.id}>
                                <td>
                                  <b>{p.name}</b>
                                  <small>{p.category}</small>
                                </td>
                                <td>{p.price ? money(p.price) : 'A confirmar'}</td>
                                <td>{complete ? money(cost) : 'Custos incompletos'}</td>
                                <td>
                                  {complete && p.price ? fmt((cost / p.price) * 100) + '%' : '—'}
                                </td>
                                <td>
                                  {pill(
                                    p.confirmed ? 'Confirmada' : 'Conferir',
                                    p.confirmed ? 'ok' : 'warn',
                                  )}
                                </td>
                                <td>
                                  <button onClick={() => open('recipe', p)}>Editar receita</button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </section>
                </>
              )}
              {tab === 'Compras' && (
                <>
                  <section className="panel">
                    <h2>Sugestão de reposição</h2>
                    <p>
                      Alvo menos saldo válido e pedidos pendentes. Consumo e prazos são estimativas
                      editáveis no cadastro.
                    </p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Insumo</th>
                            <th>Saldo</th>
                            <th>Em compra</th>
                            <th>Sugestão</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {low.map((i) => {
                            const pending = s.orders
                              .filter((o) => o.item === i.id && o.status === 'Pendente')
                              .reduce((a, o) => a + o.qty, 0);
                            return (
                              <tr key={i.id}>
                                <td>{i.name}</td>
                                <td>
                                  {fmt(available(s, i.id))} {i.unit}
                                </td>
                                <td>
                                  {fmt(pending)} {i.unit}
                                </td>
                                <td>
                                  {fmt(Math.max(0, i.target - available(s, i.id) - pending))}{' '}
                                  {i.unit}
                                </td>
                                <td>
                                  <button
                                    onClick={() =>
                                      open('order', { ...i, target: i.target - pending })
                                    }
                                  >
                                    Planejar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="panel">
                    <h2>Pedidos de compra</h2>
                    <p>
                      Planejar registra a compra aqui. O envio ao fornecedor é feito pela equipe.
                    </p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Insumo</th>
                            <th>Quantidade</th>
                            <th>Fornecedor</th>
                            <th>Entrega</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.orders.map((o) => (
                            <tr key={o.id}>
                              <td>{s.items.find((i) => i.id === o.item)?.name}</td>
                              <td>{fmt(o.qty)}</td>
                              <td>{o.supplier}</td>
                              <td>{date(o.delivery)}</td>
                              <td>{pill(o.status, o.status === 'Recebido' ? 'ok' : 'warn')}</td>
                              <td>
                                {o.status === 'Pendente' && (
                                  <>
                                    <button onClick={() => open('receive', o)}>
                                      Receber pedido
                                    </button>{' '}
                                    <button
                                      onClick={() => save({ type: 'cancelOrder', order: o.id })}
                                      disabled={busy}
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!s.orders.length && <p className="empty">Nenhuma compra planejada.</p>}
                  </section>
                </>
              )}
              {tab === 'Inventário & perdas' && (
                <>
                  <div className="action-grid">
                    <section className="panel">
                      <ClipboardCheck />
                      <h2>Contagem de estoque</h2>
                      <p>
                        Conte cada lote e registre a diferença com justificativa. Priorize os grãos,
                        filtros e café coado preparado diariamente.
                      </p>
                      {user?.role === 'manager' && (
                        <button
                          className="primary"
                          disabled={!s.lots.length}
                          onClick={() => open('count')}
                        >
                          Registrar contagem
                        </button>
                      )}
                    </section>
                    <section className="panel">
                      <Trash2 />
                      <h2>Perdas e sobras</h2>
                      <p>
                        Registre vencimento, quebra, erro de preparo ou sobra de coado. O valor usa
                        o custo do lote.
                      </p>
                      <button
                        disabled={!s.lots.some((l) => l.qty > 0)}
                        onClick={() => open('loss')}
                      >
                        Registrar perda
                      </button>
                    </section>
                  </div>
                  <section className="panel">
                    <h2>Histórico de conferência</h2>
                    <div className="history">
                      {s.events
                        .filter((e) => ['loss', 'count'].includes(e.type))
                        .map((e) => (
                          <div key={e.id}>
                            <div>
                              <b>{e.description}</b>
                              <small>
                                {new Date(e.ts).toLocaleString('pt-BR', {
                                  timeZone: 'America/Sao_Paulo',
                                })}{' '}
                                · {e.actor}
                              </small>
                            </div>
                            <strong>{e.value ? money(e.value) : '—'}</strong>
                          </div>
                        ))}
                    </div>
                  </section>
                </>
              )}
              {tab === 'Relatórios' && (
                <>
                  <div className="stats">
                    {card('Vendas de hoje', money(sales), 'Somente registros do programa', Coffee)}
                    {card('Perdas de hoje', money(losses), 'Custo dos lotes descartados', Trash2)}
                    {card(
                      'Estoque total',
                      money(stockValue),
                      'Valor pelo custo de cada lote',
                      Package,
                    )}
                    {card(
                      'Movimentos',
                      String(totalEvents),
                      'Histórico desde o início',
                      ClipboardCheck,
                    )}
                  </div>
                  <div className="toolbar">
                    <button onClick={() => downloadBackup()}>
                      <Download size={17} />
                      Exportar cópia dos dados
                    </button>
                    <button onClick={downloadMovements}>Exportar movimentos CSV</button>
                  </div>
                  <section className="panel">
                    <h2>Curva ABC · valor consumido previsto</h2>
                    <p>
                      Classificação inicial por consumo diário × custo cadastrado. Não representa
                      vendas reais. A: até 80% acumulado; B: até 95%; C: restante.
                    </p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Insumo</th>
                            <th>Valor / dia estimado</th>
                            <th>Classe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const sorted = s.items
                              .filter((i) => i.id !== 'coado')
                              .map((i) => ({ ...i, value: i.daily * i.cost }))
                              .sort((a, b) => b.value - a.value);
                            const total = sorted.reduce((a, i) => a + i.value, 0);
                            let cum = 0;
                            return sorted.map((i) => {
                              const before = cum;
                              cum += i.value;
                              return (
                                <tr key={i.id}>
                                  <td>{i.name}</td>
                                  <td>{money(i.value)}</td>
                                  <td>
                                    {pill(
                                      !total
                                        ? 'Sem base'
                                        : before / total < 0.8
                                          ? 'A'
                                          : before / total < 0.95
                                            ? 'B'
                                            : 'C',
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="panel">
                    <h2>Todos os movimentos</h2>
                    <div className="history">
                      {s.events.map((e) => (
                        <div key={e.id}>
                          <div>
                            <b>{e.description}</b>
                            <small>
                              {new Date(e.ts).toLocaleString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                              })}{' '}
                              · {e.actor}
                            </small>
                          </div>
                          <strong>{money(e.value)}</strong>
                          {e.type === 'sale' &&
                            e.allocations?.length &&
                            !s.events.some((v) => v.reverseOf === e.id) && (
                              <button
                                onClick={() => {
                                  open('cancelSale');
                                  setForm({ event: e.id, reason: '' });
                                }}
                              >
                                Estornar
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                    {s.events.length < totalEvents && (
                      <button onClick={moreHistory}>Carregar mais movimentos</button>
                    )}
                  </section>
                </>
              )}
              {tab === 'Equipe & backups' && user?.role === 'manager' && (
                <Administration people={people} save={save} busy={busy} revision={revision} />
              )}
              {tab === 'Rotinas & método' && (
                <>
                  <div className="action-grid">
                    <section className="panel">
                      <h2>Rotina da equipe</h2>
                      <p>
                        <b>Abertura:</b> conferir grãos, filtros, leite, validade e condições de
                        armazenamento.
                      </p>
                      <p>
                        <b>Pico:</b> preparar coado em bateladas conforme demanda; conferir
                        reposição de balcão.
                      </p>
                      <p>
                        <b>Fechamento:</b> contar itens críticos, registrar sobras e conferir
                        pedidos do dia seguinte.
                      </p>
                      <button className="primary" onClick={() => open('check')}>
                        Registrar rotina
                      </button>
                    </section>
                    <section className="panel">
                      <h2>Método de reposição</h2>
                      <p>
                        Ponto de pedido = consumo diário × prazo de entrega + reserva de segurança.
                      </p>
                      <p>Compra sugerida = estoque alvo − saldo válido − compras pendentes.</p>
                      <p>
                        O café coado tem prioridade de reposição. Ajuste as metas dos demais itens à
                        demanda medida e à validade informada pelo fornecedor.
                      </p>
                    </section>
                  </div>
                  <section className="panel">
                    <h2>Organização física</h2>
                    <p>
                      Separe secos, refrigeração, congelados, embalagens e bar. Identifique lotes e
                      datas; use primeiro o que vence antes. Produtos vencidos ficam bloqueados para
                      consumo pelo programa.
                    </p>
                    <p>
                      Defina validade e armazenamento conforme fornecedor e procedimentos da
                      cafeteria. O registro de temperatura pode ser feito nas observações da rotina.
                    </p>
                    <div className="sources">
                      <a
                        href="https://meuatendimento.sebrae.com.br/sites/PortalSebrae/artigos/voce-conhece-a-curva-abc-para-controle-de-estoque%2C5524ef559dc9e710VgnVCM100000d701210aRCRD"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Sebrae · Curva ABC
                      </a>
                      <a
                        href="https://legislacao.prefeitura.sp.gov.br/portaria-secretaria-municipal-da-saude-2619-de-6-de-dezembro-de-2011"
                        target="_blank"
                        rel="noreferrer"
                      >
                        São Paulo · Boas práticas
                      </a>
                      <a
                        href="https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/alimentos/manuais-guias-e-orientacoes/cartilha-boas-praticas-para-servicos-de-alimentacao.pdf"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Anvisa · Cartilha
                      </a>
                    </div>
                  </section>
                  <section className="panel">
                    <h2>Registros da equipe</h2>
                    {s.checks.map((c) => (
                      <div className="routine" key={c.id}>
                        <b>{c.name}</b>
                        <p>{c.note}</p>
                        <small>
                          {new Date(c.ts).toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                          })}{' '}
                          · {c.actor}
                        </small>
                      </div>
                    ))}
                  </section>
                </>
              )}
            </>
          )}
        </main>
        <footer>
          STEREO CAFÉ SP <span>Estoque organizado. Balcão pronto.</span>
        </footer>
      </div>
      {modal && (
        <div
          className="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Registrar operação"
          >
            <div className="section-head">
              <h2>
                {
                  {
                    receive: 'Entrada de estoque',
                    item: 'Cadastro de insumo',
                    recipe: 'Conferir ficha técnica',
                    sale: 'Registrar venda',
                    brew: 'Preparar café coado',
                    loss: 'Registrar perda',
                    count: 'Contagem por lote',
                    order: 'Planejar compra',
                    check: 'Registrar rotina',
                    cancelSale: 'Estornar venda',
                    product: 'Novo produto',
                    clearDemo: 'Encerrar exemplo',
                  }[modal.type as string]
                }
              </h2>
              <button
                aria-label="Fechar"
                className="icon-btn"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                <X />
              </button>
            </div>
            {error && (
              <p className="banner danger" role="alert">
                {error}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(
                  modal.type === 'item'
                    ? { type: 'item', data: form }
                    : { type: modal.type, ...form },
                );
              }}
            >
              {modal.type === 'receive' && (
                <>
                  {itemSelect()}
                  <div className="form-grid">
                    {field('qty', 'Quantidade na unidade do insumo', 'number', {
                      min: 0.001,
                      step: 'any',
                    })}
                    {field('cost', 'Custo por g, ml ou unidade (R$)', 'number', {
                      min: 0,
                      step: 'any',
                    })}
                    {field('code', 'Lote / referência')}
                    {field('expiry', 'Validade informada', 'date', { min: today() })}
                  </div>
                  {field('location', 'Local de armazenamento')}
                  <p className="muted">Converta antes de lançar: 1 kg = 1.000 g; 1 L = 1.000 ml.</p>
                </>
              )}
              {modal.type === 'item' && (
                <>
                  {field('name', 'Nome')}
                  <div className="form-grid">
                    <label>
                      Unidade base
                      <select
                        value={form.unit}
                        disabled={!!form.id}
                        onChange={(e) => f('unit', e.target.value)}
                      >
                        <option>un</option>
                        <option>g</option>
                        <option>ml</option>
                      </select>
                    </label>
                    {field('group', 'Categoria')}
                    {field('cost', 'Custo estimado por unidade base', 'number', {
                      min: 0,
                      step: 'any',
                    })}
                    {field('daily', 'Consumo diário na unidade base', 'number', {
                      min: 0,
                      step: 'any',
                    })}
                    {field('lead', 'Entrega em dias', 'number', { min: 0, step: 'any' })}
                    {field('safety', 'Reserva de segurança', 'number', { min: 0, step: 'any' })}
                    {field('target', 'Estoque alvo', 'number', { min: 0, step: 'any' })}
                  </div>
                  {field('supplier', 'Fornecedor')}
                </>
              )}
              {modal.type === 'recipe' && (
                <>
                  <h3>{s.products.find((p) => p.id === form.product)?.name}</h3>
                  <p className="muted">
                    Revise as sugestões e confirme os insumos por porção. Produtos recebidos prontos
                    usam uma unidade do item correspondente.
                  </p>
                  {field('price', 'Preço de venda (R$)', 'number', { min: 0.01, step: 0.01 })}
                  <label>Ingredientes por porção</label>
                  {form.recipe.map((r: any, index: number) => (
                    <div className="recipe-row" key={index}>
                      <select
                        aria-label={'Ingrediente ' + (index + 1)}
                        value={r.item}
                        onChange={(e) => {
                          const recipe = [...form.recipe];
                          recipe[index] = { ...r, item: e.target.value };
                          f('recipe', recipe);
                        }}
                      >
                        {s.items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Quantidade do ingrediente"
                        type="number"
                        min="0.001"
                        step="any"
                        value={r.qty}
                        onChange={(e) => {
                          const recipe = [...form.recipe];
                          recipe[index] = { ...r, qty: e.target.value };
                          f('recipe', recipe);
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Remover ingrediente"
                        onClick={() =>
                          f(
                            'recipe',
                            form.recipe.filter((_: any, j: number) => j !== index),
                          )
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => f('recipe', [...form.recipe, { item: s.items[0].id, qty: 1 }])}
                  >
                    Adicionar ingrediente
                  </button>
                </>
              )}
              {modal.type === 'product' && (
                <>
                  {field('name', 'Nome do produto')}
                  {field('category', 'Categoria')}
                  {field('price', 'Preço (R$)', 'number', { min: 0, step: 0.01 })}
                  <p>Depois de salvar, confira a receita para liberar vendas.</p>
                </>
              )}
              {modal.type === 'sale' && (
                <>
                  <h3>{s.products.find((p) => p.id === form.product)?.name}</h3>
                  {field('qty', 'Quantidade vendida', 'number', { min: 1, step: 1 })}
                  {s.products
                    .find((p) => p.id === form.product)
                    ?.recipe.some((r) => r.item === 'leite') && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={!!form.vegetal}
                        onChange={(e) => f('vegetal', e.target.checked)}
                      />
                      Substituir leite integral por vegetal (+ R$ 4 por produto)
                    </label>
                  )}
                  <p>A baixa seguirá os lotes válidos com vencimento mais próximo.</p>
                </>
              )}
              {modal.type === 'brew' && (
                <>
                  <p>
                    Proporção inicial sugerida: 60 g/L. Informe o rendimento e o consumo reais desta
                    batelada.
                  </p>
                  <div className="form-grid">
                    {field('qty', 'Rendimento preparado em litros', 'number', {
                      min: 0.01,
                      step: 'any',
                    })}
                    {field('grams', 'Café utilizado em gramas', 'number', { min: 1, step: 'any' })}
                    {field('filters', 'Filtros utilizados', 'number', { min: 1, step: 1 })}
                    {field('holdMinutes', 'Limite de uso da batelada (minutos)', 'number', {
                      min: 1,
                      max: 480,
                      step: 1,
                    })}
                  </div>
                  <p className="muted">
                    O limite de uso será contado a partir do preparo. Ajuste-o ao procedimento de
                    qualidade da loja; não é uma garantia sanitária.
                  </p>
                </>
              )}
              {['loss', 'count'].includes(modal.type) && (
                <>
                  {lotSelect()}
                  {field(
                    'qty',
                    modal.type === 'loss'
                      ? 'Quantidade perdida na unidade base'
                      : 'Saldo contado na unidade base',
                    'number',
                    { min: modal.type === 'loss' ? 0.001 : 0, step: 'any' },
                  )}
                  {field('reason', 'Motivo / justificativa')}
                </>
              )}
              {modal.type === 'order' && (
                <>
                  {itemSelect()}
                  {field('qty', 'Quantidade na unidade base', 'number', {
                    min: 0.001,
                    step: 'any',
                  })}
                  {field('supplier', 'Fornecedor')}
                  {field('delivery', 'Entrega prevista', 'date', { min: today() })}
                  <p className="muted">O saldo será atualizado apenas no recebimento do pedido.</p>
                </>
              )}
              {modal.type === 'check' && (
                <>
                  <label>
                    Etapa
                    <select value={form.name} onChange={(e) => f('name', e.target.value)}>
                      <option>Abertura</option>
                      <option>Pico / reposição</option>
                      <option>Fechamento</option>
                      <option>Temperaturas</option>
                      <option>Limpeza</option>
                    </select>
                  </label>
                  <label>
                    Observações
                    <textarea
                      required
                      value={form.note}
                      onChange={(e) => f('note', e.target.value)}
                      placeholder="Registre conferências, temperaturas ou ocorrências."
                    />
                  </label>
                </>
              )}
              {modal.type === 'cancelSale' && (
                <>
                  <p>
                    O estorno devolverá os insumos aos lotes de origem e ficará registrado no
                    histórico.
                  </p>
                  {field('reason', 'Motivo do estorno')}
                </>
              )}
              {modal.type === 'clearDemo' && (
                <p>
                  Todos os registros de exemplo e alterações feitas nesse modo serão apagados. O
                  cardápio inicial será mantido com estoque vazio. Exporte uma cópia antes, se
                  precisar.
                </p>
              )}
              <div className="dialog-actions">
                <button type="button" disabled={busy} onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button className="primary" disabled={busy}>
                  {busy
                    ? 'Salvando…'
                    : modal.type === 'recipe'
                      ? 'Confirmar ficha técnica'
                      : modal.type === 'clearDemo'
                        ? 'Apagar exemplo e começar'
                        : 'Salvar registro'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
