import { CREDIT_PRICE_FLOOR } from './pricing';

export const IMAGE_LIMIT = Number(process.env.NEXT_PUBLIC_IMAGE_LIMIT || 10);
export const VIDEO_LIMIT = Number(process.env.NEXT_PUBLIC_VIDEO_LIMIT || 5);

export const TARGET_PROFIT_MARGIN = 0.51;
export const VIDEO_AVG_SECONDS = 8;
export const IMAGE_CREDIT_COST = 1;

export const COST_PER_IMAGE = 0.15;
export const COST_PER_VIDEO_SECOND_FAST = 0.15;
export const COST_PER_VIDEO_SECOND_QUALITY = 0.40;
export const COST_PER_REFERENCE_IMAGE = 0.15;

const AVG_VIDEO_COST_QUALITY = (COST_PER_VIDEO_SECOND_QUALITY * VIDEO_AVG_SECONDS) + COST_PER_REFERENCE_IMAGE;
// Keep a 51% margin even on the lowest credit pack price.
export const VIDEO_CREDIT_COST = Math.ceil(AVG_VIDEO_COST_QUALITY / (1 - TARGET_PROFIT_MARGIN) / CREDIT_PRICE_FLOOR);

export const getRemainingImages = (used: number, limit: number = IMAGE_LIMIT, credits: number = 0) => {
  if (!Number.isFinite(limit)) return Number.POSITIVE_INFINITY;
  const total = limit + Math.max(0, credits);
  return Math.max(0, total - used);
};

export const getRemainingVideos = (used: number, limit: number = VIDEO_LIMIT, credits: number = 0) => {
  if (limit <= 0) return 0;
  if (!Number.isFinite(limit)) return Number.POSITIVE_INFINITY;
  const bonus = credits > 0 ? Math.floor(credits / VIDEO_CREDIT_COST) : 0;
  return Math.max(0, limit - used + bonus);
};
