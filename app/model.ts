export type Item = {
  id: string;
  name: string;
  unit: string;
  group: string;
  cost: number;
  daily: number;
  lead: number;
  safety: number;
  target: number;
  supplier: string;
};
export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  confirmed: boolean;
  recipe: { item: string; qty: number }[];
};
export type Lot = {
  id: string;
  item: string;
  qty: number;
  cost: number;
  expiry: string;
  code: string;
  location: string;
  expiresAt?: string;
};
export type State = {
  items: Item[];
  products: Product[];
  lots: Lot[];
  events: any[];
  orders: any[];
  checks: any[];
  demo: boolean;
};
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const money = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function seed(): State {
  const defs: any[] = [
    ['cafe', 'Café em grãos', 'g', 'Secos', 0.12, 4200, 2, 2100, 16800],
    ['coado', 'Café coado preparado', 'ml', 'Produção', 0.0072, 60000, 0, 0, 60000],
    ['filtro', 'Filtro de papel', 'un', 'Embalagens', 0.8, 15, 3, 30, 120],
    ['pao', 'Pão francês', 'un', 'Padaria', 1.1, 20, 1, 10, 60],
    ['manteiga', 'Manteiga', 'g', 'Refrigerados', 0.05, 300, 2, 150, 1200],
    ['leite', 'Leite integral', 'ml', 'Refrigerados', 0.006, 6000, 1, 3000, 18000],
    ['vegetal', 'Leite vegetal', 'ml', 'Refrigerados', 0.02, 1000, 2, 1000, 4000],
    ['queijo', 'Queijo', 'g', 'Refrigerados', 0.06, 1200, 2, 600, 4800],
    ['presunto', 'Presunto', 'g', 'Refrigerados', 0.045, 600, 2, 300, 2400],
    ['matcha', 'Matcha', 'g', 'Secos', 1.2, 50, 5, 100, 500],
    ['chocolate', 'Chocolate', 'g', 'Secos', 0.06, 300, 3, 300, 1500],
    ['geleia', 'Geleia', 'g', 'Refrigerados', 0.055, 300, 2, 300, 1200],
    ['brioche', 'Brioche', 'un', 'Padaria', 4, 20, 1, 5, 25],
    ['tonica', 'Água tônica', 'ml', 'Bar', 0.018, 1500, 2, 1000, 5000],
    ['agua', 'Água mineral', 'un', 'Bebidas', 3, 20, 2, 20, 80],
    ['cerveja', 'Cerveja', 'un', 'Bar', 7, 12, 3, 12, 60],
    ['gin', 'Gin', 'ml', 'Bar', 0.12, 250, 3, 250, 1500],
    ['cynar', 'Cynar', 'ml', 'Bar', 0.1, 150, 3, 150, 900],
    ['vermut', 'Vermute', 'ml', 'Bar', 0.09, 150, 3, 150, 900],
    ['campari', 'Campari', 'ml', 'Bar', 0.12, 150, 3, 150, 900],
    ['cachaca', 'Cachaça', 'ml', 'Bar', 0.07, 150, 3, 150, 900],
    ['vinho', 'Vinho', 'ml', 'Bar', 0.08, 600, 2, 300, 2400],
    ['cha', 'Chá / mate', 'g', 'Secos', 0.2, 50, 3, 50, 250],
    ['ragu', 'Ragu de carne', 'g', 'Refrigerados', 0.09, 500, 2, 250, 2000],
    ['picles', 'Picles', 'g', 'Refrigerados', 0.035, 100, 3, 100, 500],
    ['graos250', 'Café para venda 250 g', 'un', 'Varejo', 35, 3, 4, 6, 24],
    ['vela', 'Vela Soundsystem', 'un', 'Varejo', 60, 1, 7, 2, 10],
  ];
  const items: Item[] = defs.map((d) => ({
    id: d[0],
    name: d[1],
    unit: d[2],
    group: d[3],
    cost: d[4],
    daily: d[5],
    lead: d[6],
    safety: d[7],
    target: d[8],
    supplier: '',
  }));
  const products: Product[] = [];
  let nextProductId = 0;
  const add = (name: string, price: number, category: string, recipe: any[] = []) => {
    products.push({
      id: 'p' + nextProductId++,
      name,
      price,
      category,
      confirmed: false,
      recipe: recipe.map((r) => ({ item: r[0], qty: r[1] })),
    });
  };
  add('Café coado', 12, 'Cafés', [['coado', 200]]);
  nextProductId++; // Preserve existing product identifiers; p1 is retired.
  [
    ['V60', 16, 20],
    ['Espresso simples', 10, 9],
    ['Espresso duplo', 12, 18],
    ['Macchiato simples', 12, 9],
    ['Macchiato duplo', 14, 18],
  ].forEach((d: any) =>
    add(d[0], d[1], 'Cafés', [
      ['cafe', d[2]],
      ...(d[0].startsWith('Macchiato') ? [['leite', 30]] : []),
    ]),
  );
  add('Cappuccino', 16, 'Cafés', [
    ['cafe', 18],
    ['leite', 120],
  ]);
  add('Latte', 16, 'Cafés', [
    ['cafe', 18],
    ['leite', 180],
  ]);
  add('Matcha cerimonial', 18, 'Cafés', [['matcha', 3]]);
  add('Matcha latte', 20, 'Cafés', [
    ['matcha', 3],
    ['leite', 180],
  ]);
  add('Chocolate quente', 18, 'Cafés', [
    ['chocolate', 30],
    ['leite', 180],
  ]);
  add('Chá de infusão', 10, 'Cafés', [['cha', 3]]);
  [
    ['Coado gelado pequeno', 14, [['coado', 200]]],
    ['Coado gelado grande', 16, [['coado', 300]]],
    [
      'Espresso tônica',
      18,
      [
        ['cafe', 18],
        ['tonica', 150],
      ],
    ],
    [
      'Latte gelado pequeno',
      16,
      [
        ['cafe', 18],
        ['leite', 180],
      ],
    ],
    [
      'Latte gelado grande',
      20,
      [
        ['cafe', 18],
        ['leite', 250],
      ],
    ],
    ['Cold brew', 18, []],
    ['Cold brew latte', 20, []],
    ['Cold brew tônica', 20, []],
    [
      'Chocolate gelado',
      18,
      [
        ['chocolate', 30],
        ['leite', 180],
      ],
    ],
    [
      'Matcha latte gelado',
      20,
      [
        ['matcha', 3],
        ['leite', 180],
      ],
    ],
    [
      'Matcha punch',
      24,
      [
        ['matcha', 3],
        ['leite', 150],
        ['geleia', 30],
      ],
    ],
    [
      'Matcha tônica',
      20,
      [
        ['matcha', 3],
        ['tonica', 150],
      ],
    ],
    ['Mate gelado', 14, [['cha', 5]]],
    ['Adicional leite vegetal', 4, []],
  ].forEach((d: any) => add(d[0], d[1], 'Gelados', d[2]));
  [
    ['Empanada', 18],
    ['Pão de queijo', 12],
    ['Panini', 18],
  ].forEach((d: any) => {
    const id = 'acabado' + items.length;
    items.push({
      id,
      name: d[0],
      unit: 'un',
      group: 'Salgados',
      cost: 0,
      daily: 10,
      lead: 1,
      safety: 5,
      target: 30,
      supplier: '',
    });
    add(d[0], d[1], 'Salgados', [[id, 1]]);
  });
  add('Brioche na chapa', 14, 'Salgados', [
    ['brioche', 1],
    ['manteiga', 10],
  ]);
  add('Queijo quente', 24, 'Salgados', [
    ['pao', 1],
    ['queijo', 60],
    ['manteiga', 10],
  ]);
  add('Misto quente', 26, 'Salgados', [
    ['pao', 1],
    ['queijo', 40],
    ['presunto', 40],
    ['manteiga', 10],
  ]);
  add('Philly melt', 34, 'Salgados', [
    ['pao', 1],
    ['ragu', 100],
    ['queijo', 40],
    ['picles', 20],
  ]);
  [
    ['Fatia de bolo', 22],
    ['Brownie', 16],
    ['Cinnamon roll', 16],
    ['Cookie', 17],
    ['Banana bread', 18],
    ['Pão de melado', 18],
    ['Cheesecake basco', 22],
  ].forEach((d: any) => {
    const id = 'doce' + items.length;
    items.push({
      id,
      name: d[0],
      unit: 'un',
      group: 'Doces',
      cost: 0,
      daily: 6,
      lead: 2,
      safety: 4,
      target: 24,
      supplier: '',
    });
    add(d[0], d[1], 'Doces', [[id, 1]]);
  });
  add('Brioche com geleia', 18, 'Doces', [
    ['brioche', 1],
    ['geleia', 30],
  ]);
  add('Cheesecake basco com geleia', 26, 'Doces', [
    [items.find((i) => i.name === 'Cheesecake basco')!.id, 1],
    ['geleia', 30],
  ]);
  [
    ['Água sem gás', 10, [['agua', 1]]],
    ['Água com gás', 10, []],
    ['Baer-Mate', 16, []],
    ['Kiro', 18, []],
    ['Cerveja', 14, [['cerveja', 1]]],
    [
      'Cynar tônica',
      30,
      [
        ['cynar', 50],
        ['tonica', 150],
      ],
    ],
    [
      'Gin tônica',
      30,
      [
        ['gin', 50],
        ['tonica', 150],
      ],
    ],
    [
      'Negroni',
      30,
      [
        ['gin', 30],
        ['vermut', 30],
        ['campari', 30],
      ],
    ],
    [
      'Rabo de galo',
      30,
      [
        ['cachaca', 50],
        ['vermut', 25],
      ],
    ],
    ['Vinho em taça', 25, [['vinho', 150]]],
  ].forEach((d: any) => add(d[0], d[1], 'Bar', d[2]));
  add('Café em grãos 250 g', 60, 'Varejo', [['graos250', 1]]);
  add('Vela Soundsystem', 120, 'Varejo', [['vela', 1]]);
  return { items, products, lots: [], events: [], orders: [], checks: [], demo: false };
}
export function currentMenu(s: State): State {
  return {
    ...s,
    products: s.products.filter((p) => p.id !== 'p1'),
    lots: s.lots.map((l) =>
      l.item === 'coado' && !l.expiresAt
        ? { ...l, expiresAt: new Date(l.expiry + 'T00:00:00-03:00').toISOString() }
        : l,
    ),
  };
}
export function available(s: State, id: string) {
  return s.lots
    .filter(
      (l) =>
        l.item === id &&
        l.expiry >= today() &&
        (!l.expiresAt || l.expiresAt > new Date().toISOString()),
    )
    .reduce((a, l) => a + l.qty, 0);
}
export function consume(s: State, id: string, qty: number) {
  if (available(s, id) + 1e-7 < qty)
    throw Error('Estoque válido insuficiente: ' + s.items.find((i) => i.id === id)?.name);
  let left = qty;
  for (const lot of s.lots
    .filter((l) => l.item === id && l.expiry >= today())
    .sort((a, b) => a.expiry.localeCompare(b.expiry))) {
    const n = Math.min(lot.qty, left);
    lot.qty -= n;
    left -= n;
    if (left < 1e-7) break;
  }
}
export { act } from '../lib/operations.ts';
