import type { EnumValues } from './enum';

export const PLAN_ID = {
  FREE: 'free',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
} as const;

export type PlanId = EnumValues<typeof PLAN_ID>;

export const BILLING_INTERVAL = {
  MONTH: 'month',
  YEAR: 'year',
} as const;

export type BillingInterval = EnumValues<typeof BILLING_INTERVAL>;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
} as const;

export type IStripeSubscription = {
  stripeSubscriptionId: string | null;
  stripeSubscriptionPriceId: string | null;
  stripeSubscriptionStatus: string | null;
  stripeSubscriptionCurrentPeriodEnd: number | null;
};
