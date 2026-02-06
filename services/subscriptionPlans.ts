import { IMAGE_LIMIT, VIDEO_AVG_SECONDS } from './usageLimits';
import { CREDIT_PACKS, type CreditPack } from './pricing';
import type { PlanTier } from '@/types';
export { VIDEO_AVG_SECONDS };

export type PlanDefinition = {
  tier: PlanTier;
  name: string;
  priceMonthly: number | null;
  images: number;
  videos: number;
  trialDays?: number;
  badge?: string;
  description: string;
  features: string[];
};

export const PLAN_CATALOG: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: 'free',
    name: 'Free',
    priceMonthly: 0,
    images: IMAGE_LIMIT,
    videos: 0,
    description: 'Best for first-time exploration.',
    features: [
      `${IMAGE_LIMIT} image generations`,
      'Video generation with credits',
      'Core brand context builder',
      'Community support',
    ],
  },
  basic: {
    tier: 'basic',
    name: 'Basic',
    priceMonthly: 29,
    images: 50,
    videos: 3,
    trialDays: 3,
    badge: 'Most Popular',
    description: 'Launch campaigns with video access.',
    features: [
      '50 image generations',
      `3 videos (avg ${VIDEO_AVG_SECONDS}s)`,
      'Quality Mode video generation (reference frames)',
      'Campaign packs + carousels',
      'Priority queue',
    ],
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    priceMonthly: 79,
    images: 150,
    videos: 10,
    badge: 'Scale Mode',
    description: 'For teams shipping weekly campaigns.',
    features: [
      '150 image generations',
      `10 videos (avg ${VIDEO_AVG_SECONDS}s)`,
      'Quality Mode video generation (reference frames)',
      'Advanced brand consistency checks',
      'Faster turnaround',
    ],
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    priceMonthly: null,
    images: Number.POSITIVE_INFINITY,
    videos: Number.POSITIVE_INFINITY,
    badge: 'Custom',
    description: 'Custom volume + dedicated support.',
    features: [
      'Unlimited images + videos',
      'Custom model routing',
      'SLA + dedicated success',
      'SSO + team provisioning',
    ],
  },
};

export type { CreditPack };
export { CREDIT_PACKS };

export const getPlanLimits = (tier: PlanTier) => {
  const plan = PLAN_CATALOG[tier] ?? PLAN_CATALOG.free;
  return {
    imageLimit: plan.images,
    videoLimit: plan.videos,
  };
};

export const formatLimit = (limit: number) => {
  if (!Number.isFinite(limit)) return 'Unlimited';
  return String(limit);
};
