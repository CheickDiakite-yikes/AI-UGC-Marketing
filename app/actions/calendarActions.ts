'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { boards, generatedItems, calendarItems } from '@/db/schema';
import { getSession } from './authActions';

type CalendarBoardItem = {
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'carousel';
  previewUrl: string | null;
  createdAt: string;
};

type CalendarBoard = {
  id: string;
  name: string;
  items: CalendarBoardItem[];
};

type CalendarEntry = {
  id: string;
  boardId: string;
  boardName: string;
  itemId: string;
  itemTitle: string;
  itemType: 'text' | 'image' | 'video' | 'carousel';
  previewUrl: string | null;
  scheduledFor: string;
  note?: string | null;
};

type CalendarDashboardData = {
  boards: CalendarBoard[];
  calendarItems: CalendarEntry[];
};

const resolveStorageUrl = (storageKey?: string | null) => {
  if (!storageKey) return null;
  return `/api/storage/${encodeURIComponent(storageKey)}`;
};

const resolveCarouselUrl = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('/api/')) {
    return url;
  }
  return `/api/storage/${encodeURIComponent(url)}`;
};

const resolveMediaUrl = (content?: string | null) => {
  if (!content) return null;
  if (content.startsWith('data:') || content.startsWith('http') || content.startsWith('/api/')) {
    return content;
  }
  return null;
};

const resolvePreviewUrl = (item: {
  type: 'text' | 'image' | 'video' | 'carousel';
  content?: string | null;
  storageKey?: string | null;
  carouselUrls?: unknown;
}) => {
  if (item.type === 'carousel') {
    const urls = Array.isArray(item.carouselUrls) ? item.carouselUrls : [];
    const first = urls.length > 0 ? String(urls[0]) : null;
    return first ? resolveCarouselUrl(first) : null;
  }
  if (item.type === 'text') {
    return null;
  }
  return resolveStorageUrl(item.storageKey) || resolveMediaUrl(item.content);
};

const parseScheduledDate = (value: string) => {
  if (!value) {
    throw new Error('Scheduled date is required');
  }
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyMatch.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid scheduled date');
  }
  return parsed;
};

export async function getCalendarDashboardData(): Promise<CalendarDashboardData> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { boards: [], calendarItems: [] };
  }

  const boardRows = await db.query.boards.findMany({
    where: eq(boards.userId, session.userId as string),
    orderBy: (board, { desc }) => [desc(board.updatedAt)],
    with: {
      generatedItems: {
        orderBy: (items, { desc }) => [desc(items.createdAt)],
      },
    },
  });

  const boardsData: CalendarBoard[] = boardRows.map(board => ({
    id: board.id,
    name: board.name,
    items: (board.generatedItems || [])
      .filter(item => item.type !== 'text')
      .map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        previewUrl: resolvePreviewUrl(item),
        createdAt: item.createdAt.toISOString(),
      })),
  }));

  const calendarRows = await db
    .select({
      calendarId: calendarItems.id,
      boardId: calendarItems.boardId,
      boardName: boards.name,
      itemId: generatedItems.id,
      itemTitle: generatedItems.title,
      itemType: generatedItems.type,
      itemContent: generatedItems.content,
      itemStorageKey: generatedItems.storageKey,
      itemCarouselUrls: generatedItems.carouselUrls,
      scheduledFor: calendarItems.scheduledFor,
      note: calendarItems.note,
    })
    .from(calendarItems)
    .innerJoin(boards, eq(calendarItems.boardId, boards.id))
    .innerJoin(generatedItems, eq(calendarItems.itemId, generatedItems.id))
    .where(eq(calendarItems.userId, session.userId as string))
    .orderBy(desc(calendarItems.scheduledFor));

  const calendarData: CalendarEntry[] = calendarRows.map(row => ({
    id: row.calendarId,
    boardId: row.boardId,
    boardName: row.boardName,
    itemId: row.itemId,
    itemTitle: row.itemTitle,
    itemType: row.itemType,
    previewUrl: resolvePreviewUrl({
      type: row.itemType,
      content: row.itemContent,
      storageKey: row.itemStorageKey,
      carouselUrls: row.itemCarouselUrls,
    }),
    scheduledFor: row.scheduledFor.toISOString(),
    note: row.note ?? null,
  }));

  return { boards: boardsData, calendarItems: calendarData };
}

export async function createCalendarItemAction(payload: {
  boardId: string;
  itemId: string;
  scheduledFor: string;
  note?: string | null;
}) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const { boardId, itemId, scheduledFor, note } = payload;
  const scheduledDate = parseScheduledDate(scheduledFor);

  const board = await db.query.boards.findFirst({
    where: and(eq(boards.id, boardId), eq(boards.userId, session.userId as string)),
    columns: { id: true, name: true },
  });

  if (!board) {
    return { success: false, error: 'Board not found' };
  }

  const item = await db.query.generatedItems.findFirst({
    where: and(eq(generatedItems.id, itemId), eq(generatedItems.boardId, boardId)),
    columns: {
      id: true,
      title: true,
      type: true,
      content: true,
      storageKey: true,
      carouselUrls: true,
    },
  });

  if (!item) {
    return { success: false, error: 'Item not found' };
  }

  const [created] = await db.insert(calendarItems).values({
    id: crypto.randomUUID(),
    userId: session.userId as string,
    boardId,
    itemId,
    scheduledFor: scheduledDate,
    note: note || null,
  }).returning();

  const calendarEntry: CalendarEntry = {
    id: created.id,
    boardId,
    boardName: board.name,
    itemId,
    itemTitle: item.title,
    itemType: item.type,
    previewUrl: resolvePreviewUrl(item),
    scheduledFor: created.scheduledFor.toISOString(),
    note: created.note ?? null,
  };

  revalidatePath('/profile/dashboard');
  return { success: true, item: calendarEntry };
}

export async function deleteCalendarItemAction(calendarItemId: string) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const existing = await db.query.calendarItems.findFirst({
    where: and(eq(calendarItems.id, calendarItemId), eq(calendarItems.userId, session.userId as string)),
    columns: { id: true },
  });

  if (!existing) {
    return { success: false, error: 'Calendar entry not found' };
  }

  await db.delete(calendarItems).where(eq(calendarItems.id, calendarItemId));

  revalidatePath('/profile/dashboard');
  return { success: true };
}
