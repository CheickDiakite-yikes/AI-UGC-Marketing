import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export async function createJob(
  boardId: string,
  userId: string,
  type: string,
  payload: Record<string, unknown>
) {
  const [job] = await db
    .insert(jobs)
    .values({
      boardId,
      userId,
      type,
      payload,
      status: 'pending',
      attempts: 0,
    })
    .returning();

  return job;
}

export async function getJob(jobId: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  return job || null;
}

export async function getJobsByBoard(boardId: string) {
  return db.select().from(jobs).where(eq(jobs.boardId, boardId));
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  result?: Record<string, unknown>,
  error?: string
) {
  const updateData: {
    status: JobStatus;
    updatedAt: Date;
    result?: Record<string, unknown>;
    error?: string;
    completedAt?: Date;
  } = {
    status,
    updatedAt: new Date(),
  };

  if (result !== undefined) {
    updateData.result = result;
  }

  if (error !== undefined) {
    updateData.error = error;
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completedAt = new Date();
  }

  const [updatedJob] = await db
    .update(jobs)
    .set(updateData)
    .where(eq(jobs.id, jobId))
    .returning();

  return updatedJob;
}

export async function getPendingJobs(limit: number = 10) {
  return db
    .select()
    .from(jobs)
    .where(eq(jobs.status, 'pending'))
    .orderBy(jobs.createdAt)
    .limit(limit);
}

export async function claimJob(jobId: string) {
  const [claimedJob] = await db
    .update(jobs)
    .set({
      status: 'processing',
      attempts: sql`${jobs.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, 'pending')))
    .returning();

  return claimedJob || null;
}
