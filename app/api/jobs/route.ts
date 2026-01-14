import { NextRequest, NextResponse } from 'next/server';
import { createJob, getJobsByBoard } from '@/services/jobService';
import { getSession } from '@/app/actions/authActions';
import { db } from '@/db';
import { boards } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
