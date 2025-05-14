import {
  bigint,
  pgTable,
  text,
  timestamp,
  json,
  integer,
} from 'drizzle-orm/pg-core';

// export const organizationTable = pgTable(
//   'organizations',
//   {
//     id: integer().primaryKey().generatedAlwaysAsIdentity(),
//     stripeCustomerId: text('stripe_customer_id'),
//     stripeSubscriptionId: text('stripe_subscription_id'),
//     stripeSubscriptionPriceId: text('stripe_subscription_price_id'),
//     stripeSubscriptionStatus: text('stripe_subscription_status'),
//     stripeSubscriptionCurrentPeriodEnd: bigint(
//       'stripe_subscription_current_period_end',
//       { mode: 'number' },
//     ),
//     updatedAt: timestamp('updated_at', { mode: 'date' })
//       .defaultNow()
//       .$onUpdate(() => new Date())
//       .notNull(),
//     createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
//   },
//   (table) => [uniqueIndex('stripe_customer_id_idx').on(table.stripeCustomerId)],
// );

export const eventsTable = pgTable('events', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: text('type').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  properties: json('properties').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
