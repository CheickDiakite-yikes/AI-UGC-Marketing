import { NextRequest, NextResponse } from 'next/server';
import { createJob, getJobsByBoard } from '@/services/jobService';
import { getSession } from '@/app/actions/authActions';
import { db } from '@/db';
import { boards, jobs, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { IMAGE_LIMIT, VIDEO_LIMIT, getRemainingImages, getRemainingVideos } from '@/services/usageLimits';

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
          videosGenerated: true
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (type === 'generate_image' && user.imagesGenerated >= IMAGE_LIMIT) {
        return NextResponse.json({
          error: 'Image quota exceeded',
          code: 'QUOTA_EXCEEDED',
          limit: IMAGE_LIMIT,
          used: user.imagesGenerated,
          remaining: getRemainingImages(user.imagesGenerated)
        }, { status: 402 });
      }

      if (type === 'generate_video' && user.videosGenerated >= VIDEO_LIMIT) {
        return NextResponse.json({
          error: 'Video quota exceeded',
          code: 'QUOTA_EXCEEDED',
          limit: VIDEO_LIMIT,
          used: user.videosGenerated,
          remaining: getRemainingVideos(user.videosGenerated)
        }, { status: 402 });
      }

      if (type === 'generate_carousel') {
        const slides = Array.isArray(payload?.slides) ? payload.slides.length : 0;
        if (slides > 0 && user.imagesGenerated + slides > IMAGE_LIMIT) {
          return NextResponse.json({
            error: 'Image quota exceeded',
            code: 'QUOTA_EXCEEDED',
            limit: IMAGE_LIMIT,
            used: user.imagesGenerated,
            remaining: getRemainingImages(user.imagesGenerated)
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
