import { z } from 'zod';

const text = z.string().trim().min(1).max(150);
const quantity = z.coerce.number().finite().positive().max(100000000);
const nonnegative = z.coerce.number().finite().min(0).max(100000000);
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Data inválida');
const ingredient = z.object({ item: text, qty: quantity });
export const itemSchema = z.object({
  id: text.optional(),
  name: text,
  unit: z.enum(['g', 'ml', 'un']),
  group: text,
  cost: nonnegative,
  daily: nonnegative,
  lead: nonnegative,
  safety: nonnegative,
  target: nonnegative,
  supplier: z.string().trim().max(150).default(''),
});
const product = z.object({
  id: text,
  name: text,
  category: text,
  price: nonnegative,
  confirmed: z.boolean(),
  recipe: z.array(ingredient).max(50),
});
const lot = z.object({
  id: text,
  item: text,
  qty: nonnegative,
  cost: nonnegative,
  expiry: isoDate,
  code: text,
  location: z.string().max(150),
  expiresAt: z.string().datetime().optional(),
});
export const stateSchema = z
  .object({
    items: z
      .array(itemSchema.extend({ id: text }))
      .min(1)
      .max(1000),
    products: z.array(product).min(1).max(1000),
    lots: z.array(lot).max(20000),
    orders: z
      .array(
        z.object({
          id: text,
          item: text,
          qty: quantity,
          supplier: text,
          delivery: isoDate,
          status: z.enum(['Pendente', 'Recebido', 'Cancelado']),
        }),
      )
      .max(20000),
    checks: z
      .array(
        z.object({
          id: text,
          name: text,
          note: z.string().max(2000),
          ts: z.string().datetime(),
          actor: z.string().max(150),
        }),
      )
      .max(20000),
    events: z.array(z.any()).max(100000),
    demo: z.boolean(),
  })
  .superRefine((s, ctx) => {
    const items = new Set(s.items.map((i) => i.id));
    for (const list of [s.items, s.products, s.lots])
      if (new Set(list.map((i) => i.id)).size !== list.length)
        ctx.addIssue({ code: 'custom', message: 'Identificadores duplicados' });
    if (
      s.lots.some((l) => !items.has(l.item)) ||
      s.orders.some((o) => !items.has(o.item)) ||
      s.products.some((p) => p.recipe.some((r) => !items.has(r.item)))
    )
      ctx.addIssue({ code: 'custom', message: 'Referência de insumo inválida' });
    for (const p of s.products)
      if (new Set(p.recipe.map((r) => r.item)).size !== p.recipe.length)
        ctx.addIssue({ code: 'custom', message: 'Ingrediente duplicado' });
    for (const id of ['cafe', 'filtro', 'coado'])
      if (!items.has(id)) ctx.addIssue({ code: 'custom', message: 'Backup sem insumo essencial' });
    for (const [id, unit] of [
      ['cafe', 'g'],
      ['filtro', 'un'],
      ['coado', 'ml'],
    ])
      if (s.items.find((i) => i.id === id)?.unit !== unit)
        ctx.addIssue({ code: 'custom', message: 'Unidade base de insumo essencial inválida' });
  });

export const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('receive'),
    item: text,
    qty: quantity,
    cost: nonnegative,
    code: text,
    expiry: isoDate,
    location: z.string().max(150).default(''),
    order: text.optional(),
  }),
  z.object({
    type: z.literal('sale'),
    product: text,
    qty: quantity.int(),
    vegetal: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('brew'),
    qty: quantity,
    grams: quantity,
    filters: quantity.int(),
    holdMinutes: z.coerce.number().int().min(1).max(480).default(60),
  }),
  z.object({ type: z.literal('loss'), lot: text, qty: quantity, reason: text }),
  z.object({ type: z.literal('count'), lot: text, qty: nonnegative, reason: text }),
  z.object({ type: z.literal('item'), data: itemSchema }),
  z.object({
    type: z.literal('recipe'),
    product: text,
    price: quantity,
    recipe: z.array(ingredient).min(1).max(50),
  }),
  z.object({
    type: z.literal('order'),
    item: text,
    qty: quantity,
    supplier: text,
    delivery: isoDate,
  }),
  z.object({ type: z.literal('cancelOrder'), order: text }),
  z.object({ type: z.literal('product'), name: text, category: text, price: nonnegative }),
  z.object({ type: z.literal('check'), name: text, note: z.string().trim().min(1).max(2000) }),
  z.object({ type: z.literal('demo') }),
  z.object({ type: z.literal('clearDemo') }),
  z.object({ type: z.literal('cancelSale'), event: text, reason: text }),
  z.object({
    type: z.literal('restore'),
    backup: z.object({ state: stateSchema }),
    confirmation: z.literal('RESTAURAR'),
  }),
  z.object({
    type: z.literal('staff'),
    email: z
      .string()
      .email()
      .max(150)
      .transform((v) => v.toLowerCase()),
    name: text,
    role: z.enum(['manager', 'operator']),
    active: z.boolean(),
  }),
]);
export const mutationSchema = z.object({
  revision: z.number().int().nonnegative(),
  operationId: z.string().uuid(),
  action: actionSchema,
});
