import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { boards, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/app/actions/authActions';
import { createJob } from '@/services/jobService';
import type { PlanTier } from '@/types';

type PackItem = {
  type: 'image' | 'video' | 'carousel';
  title?: string;
  hook?: string;
  caption?: string;
  archetype?: string;
  visual_prompt?: string;
  carousel_prompts?: string[];
  aspectRatio?: string;
  productId?: string;
  ingredientAssetIds?: string[];
  qualityMode?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { boardId, items } = body as { boardId?: string; items?: PackItem[] };

    if (!boardId || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
    });
    if (!board || board.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId as string),
      columns: { planTier: true, ahaPackUsed: true },
    });
    const planTier = (user?.planTier as PlanTier) || 'free';
    if (planTier !== 'free') {
      return NextResponse.json({ error: 'Aha Pack is only available on the free plan.' }, { status: 403 });
    }
    if (user?.ahaPackUsed) {
      return NextResponse.json({ error: 'Aha Pack already redeemed.' }, { status: 409 });
    }

    const imageItem = items.find(item => item.type === 'image');
    const videoItem = items.find(item => item.type === 'video');
    const carouselItem = items.find(item => item.type === 'carousel');

    if (!imageItem || !videoItem || !carouselItem) {
      return NextResponse.json({ error: 'Aha Pack must include 1 image, 1 carousel, and 1 video.' }, { status: 400 });
    }

    const carouselPrompts = Array.isArray(carouselItem.carousel_prompts)
      ? carouselItem.carousel_prompts.slice(0, 2)
      : [];
    if (carouselPrompts.length < 2) {
      return NextResponse.json({ error: 'Aha Pack carousel must include 2 slide prompts.' }, { status: 400 });
    }

    const jobs: Array<{ id: string; type: string; payload: Record<string, unknown> }> = [];

    const imageJob = await createJob(boardId, session.userId as string, 'generate_image', {
      prompt: imageItem.visual_prompt,
      aspectRatio: imageItem.aspectRatio || '1:1',
      productId: imageItem.productId,
      title: imageItem.title,
      hook: imageItem.hook,
      caption: imageItem.caption,
      archetype: imageItem.archetype,
      freebie: true,
      traceId: crypto.randomUUID(),
    });
    jobs.push({ id: imageJob.id, type: imageJob.type, payload: imageJob.payload });

    const carouselJob = await createJob(boardId, session.userId as string, 'generate_carousel', {
      slides: carouselPrompts.map((prompt) => ({ prompt })),
      aspectRatio: carouselItem.aspectRatio || '1:1',
      title: carouselItem.title,
      description: carouselItem.caption,
      metadata: {
        hook: carouselItem.hook,
        archetype: carouselItem.archetype,
      },
      freebie: true,
      traceId: crypto.randomUUID(),
    });
    jobs.push({ id: carouselJob.id, type: carouselJob.type, payload: carouselJob.payload });

    const videoJob = await createJob(boardId, session.userId as string, 'generate_video', {
      prompt: videoItem.visual_prompt,
      aspectRatio: videoItem.aspectRatio || '16:9',
      resolution: '1080p',
      productId: videoItem.productId,
      ingredientAssetIds: videoItem.ingredientAssetIds,
      qualityMode: true,
      title: videoItem.title,
      hook: videoItem.hook,
      caption: videoItem.caption,
      archetype: videoItem.archetype,
      freebie: true,
      traceId: crypto.randomUUID(),
    });
    jobs.push({ id: videoJob.id, type: videoJob.type, payload: videoJob.payload });

    await db.update(users)
      .set({ ahaPackUsed: true, ahaPackUsedAt: new Date() })
      .where(eq(users.id, session.userId as string));

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('[API] Aha pack error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
