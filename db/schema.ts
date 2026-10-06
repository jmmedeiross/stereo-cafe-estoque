import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const cafeState = sqliteTable('cafe_state', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull(),
  data: text('data').notNull(),
  lastOperation: text('last_operation'),
});

export const ledger = sqliteTable(
  'ledger',
  {
    id: text('id').primaryKey(),
    ts: text('ts').notNull(),
    businessDay: text('business_day').notNull(),
    type: text('type').notNull(),
    actor: text('actor').notNull(),
    data: text('data').notNull(),
    reverseOf: text('reverse_of'),
  },
  (table) => [
    index('idx_ledger_day_ts').on(table.businessDay, table.ts),
    index('idx_ledger_ts_id').on(table.ts, table.id),
    uniqueIndex('idx_ledger_reverse_of').on(table.reverseOf),
  ],
);

export const operations = sqliteTable('operations', {
  id: text('id').primaryKey(),
  digest: text('digest').notNull(),
  revision: integer('revision').notNull(),
  createdAt: text('created_at').notNull(),
});

export const staff = sqliteTable('staff', {
  email: text('email').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  active: integer('active').notNull().default(1),
});

export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  actor: text('actor').notNull(),
  data: text('data').notNull(),
});
