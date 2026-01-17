import 'server-only';

import type { PlanTier } from '@/types';

const PLAN_PRICE_IDS: Record<'basic' | 'pro', string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO,
};

const CREDIT_PRICE_IDS: Record<number, string | undefined> = {
  50: process.env.STRIPE_PRICE_CREDITS_50,
  100: process.env.STRIPE_PRICE_CREDITS_100,
  200: process.env.STRIPE_PRICE_CREDITS_200,
};

export const getPlanPriceId = (tier: PlanTier) => {
  if (tier !== 'basic' && tier !== 'pro') {
    throw new Error(`Stripe checkout is not available for plan: ${tier}`);
  }
  const priceId = PLAN_PRICE_IDS[tier];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for ${tier} plan`);
  }
  return priceId;
};

export const getCreditsPriceId = (credits: number) => {
  const priceId = CREDIT_PRICE_IDS[credits];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for ${credits} credit pack`);
  }
  return priceId;
};

export const getTierFromPriceId = (priceId?: string | null): PlanTier | null => {
  if (!priceId) return null;
  const entry = Object.entries(PLAN_PRICE_IDS).find(([, id]) => id === priceId);
  return entry ? (entry[0] as PlanTier) : null;
};

export const getCreditsFromPriceId = (priceId?: string | null): number | null => {
  if (!priceId) return null;
  const entry = Object.entries(CREDIT_PRICE_IDS).find(([, id]) => id === priceId);
  return entry ? Number(entry[0]) : null;
};
