import 'server-only';

import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getPlanLimits } from '@/services/subscriptionPlans';
import { IMAGE_CREDIT_COST, VIDEO_CREDIT_COST } from '@/services/usageLimits';
import type { PlanTier } from '@/types';

type UsageType = 'image' | 'video';

export type UsageChargeResult = {
  creditsUsed: number;
  planUsed: number;
};

const calculateCharges = (
  user: { imagesGenerated: number; videosGenerated: number; creditBalance: number; planTier: PlanTier | null },
  type: UsageType,
  count: number,
) => {
  const planTier = (user.planTier as PlanTier) || 'free';
  const { imageLimit, videoLimit } = getPlanLimits(planTier);

  if (type === 'image') {
    if (!Number.isFinite(imageLimit)) {
      return { planUsed: count, creditsNeeded: 0 };
    }
    const remainingPlan = Math.max(0, imageLimit - user.imagesGenerated);
    const planUsed = Math.min(count, remainingPlan);
    const creditsNeeded = Math.max(0, count - planUsed) * IMAGE_CREDIT_COST;
    return { planUsed, creditsNeeded };
  }

  if (videoLimit <= 0) {
    throw new Error('PLAN_REQUIRED');
  }
  if (!Number.isFinite(videoLimit)) {
    return { planUsed: count, creditsNeeded: 0 };
  }
  const remainingPlan = Math.max(0, videoLimit - user.videosGenerated);
  const planUsed = Math.min(count, remainingPlan);
  const creditsNeeded = Math.max(0, count - planUsed) * VIDEO_CREDIT_COST;
  return { planUsed, creditsNeeded };
};

export async function consumeUsage(userId: string, type: UsageType, count: number) {
  if (count <= 0) {
    return { creditsUsed: 0, planUsed: 0 };
  }

  return db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { imagesGenerated: true, videosGenerated: true, creditBalance: true, planTier: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const creditBalance = user.creditBalance ?? 0;
    const { planUsed, creditsNeeded } = calculateCharges({ ...user, creditBalance }, type, count);

    if (creditsNeeded > creditBalance) {
      throw new Error('QUOTA_EXCEEDED');
    }

    const updates: Record<string, unknown> =
      type === 'image'
        ? { imagesGenerated: sql`${users.imagesGenerated} + ${count}` }
        : { videosGenerated: sql`${users.videosGenerated} + ${count}` };

    if (creditsNeeded > 0) {
      updates.creditBalance = sql`${users.creditBalance} - ${creditsNeeded}`;
    }

    const updateQuery = tx.update(users)
      .set(updates)
      .where(
        creditsNeeded > 0
          ? and(eq(users.id, userId), gte(users.creditBalance, creditsNeeded))
          : eq(users.id, userId),
      )
      .returning({ id: users.id });

    const updated = await updateQuery;
    if (updated.length === 0) {
      throw new Error('QUOTA_EXCEEDED');
    }

    return { creditsUsed: creditsNeeded, planUsed };
  });
}
