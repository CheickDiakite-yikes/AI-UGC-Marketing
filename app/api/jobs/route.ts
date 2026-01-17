import { NextRequest, NextResponse } from 'next/server';
import { createJob, getJobsByBoard } from '@/services/jobService';
import { getSession } from '@/app/actions/authActions';
import { db } from '@/db';
import { boards, jobs, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getRemainingImages, getRemainingVideos } from '@/services/usageLimits';
import { getPlanLimits } from '@/services/subscriptionPlans';
import type { PlanTier } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { boardId, type, payload } = body;

    if (!boardId || !type || !payload) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    if (board.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (type === 'generate_image' || type === 'generate_video' || type === 'generate_carousel') {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId as string),
        columns: {
          imagesGenerated: true,
          videosGenerated: true,
          planTier: true,
          creditBalance: true,
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const planTier = (user.planTier as PlanTier) || 'free';
      const { imageLimit, videoLimit } = getPlanLimits(planTier);
      const credits = user.creditBalance || 0;
      const remainingImages = getRemainingImages(user.imagesGenerated, imageLimit, credits);
      const remainingVideos = getRemainingVideos(user.videosGenerated, videoLimit, credits);

      if (type === 'generate_video' && videoLimit <= 0) {
        return NextResponse.json({
          error: 'Video generation requires a subscription.',
          code: 'PLAN_REQUIRED',
          plan: 'basic',
        }, { status: 402 });
      }

      if (type === 'generate_image' && remainingImages <= 0) {
        return NextResponse.json({
          error: 'Image quota exceeded',
          code: 'QUOTA_EXCEEDED',
          limit: imageLimit,
          used: user.imagesGenerated,
          remaining: remainingImages
        }, { status: 402 });
      }

      if (type === 'generate_video' && remainingVideos <= 0) {
        return NextResponse.json({
          error: 'Video quota exceeded',
          code: 'QUOTA_EXCEEDED',
          limit: videoLimit,
          used: user.videosGenerated,
          remaining: remainingVideos
        }, { status: 402 });
      }

      if (type === 'generate_carousel') {
        const slides = Array.isArray(payload?.slides) ? payload.slides.length : 0;
        if (slides > 0 && slides > remainingImages) {
          return NextResponse.json({
            error: 'Image quota exceeded',
            code: 'QUOTA_EXCEEDED',
            limit: imageLimit,
            used: user.imagesGenerated,
            remaining: remainingImages
          }, { status: 402 });
        }
      }
    }

    const job = await createJob(boardId, session.userId as string, type, payload);

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
    });
  } catch (error) {
    console.error('[API] Error creating job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    if (board.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const jobs = await getJobsByBoard(boardId);

    return NextResponse.json(jobs.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    })));
  } catch (error) {
    console.error('[API] Error fetching jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const action = searchParams.get('action');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
    });

    if (!board || board.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'clear-stuck') {
      const result = await db.update(jobs)
        .set({ status: 'failed', error: 'Cleared by user - job was stuck', updatedAt: new Date() })
        .where(
          and(
            eq(jobs.boardId, boardId),
            inArray(jobs.status, ['pending', 'processing'])
          )
        )
        .returning({ id: jobs.id });

      return NextResponse.json({ 
        cleared: result.length,
        message: `Cleared ${result.length} stuck jobs`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API] Error clearing jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
