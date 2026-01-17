export const IMAGE_LIMIT = Number(process.env.NEXT_PUBLIC_IMAGE_LIMIT || 10);
export const VIDEO_LIMIT = Number(process.env.NEXT_PUBLIC_VIDEO_LIMIT || 5);

export const VIDEO_AVG_SECONDS = 8;
export const IMAGE_CREDIT_COST = 1;
export const VIDEO_CREDIT_COST = VIDEO_AVG_SECONDS;

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
