'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, desc, gte, lt, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { boards, generatedItems, calendarItems } from '@/db/schema';
import { getSession } from './authActions';
import { createPerfTimer } from '@/services/performanceLogger';

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

type CalendarDashboardOptions = {
  boardItemLimit?: number;
  calendarItemLimit?: number;
};

const DEFAULT_BOARD_ITEM_LIMIT = 80;
const DEFAULT_CALENDAR_ITEM_LIMIT = 180;
const MAX_DASHBOARD_LIMIT = 500;

const normalizeLimit = (value: number | undefined, fallback: number) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(MAX_DASHBOARD_LIMIT, Math.floor(value as number)));
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

const parseDateKey = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error('Invalid date key');
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const getDateRangeFromKey = (value: string) => {
  const { year, month, day } = parseDateKey(value);
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  return { start, end };
};

const hydrateCalendarEntry = async (calendarId: string) => {
  const rows = await db
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
    .where(eq(calendarItems.id, calendarId))
    .limit(1);

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
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
  } satisfies CalendarEntry;
};

const hydrateCalendarEntriesByIds = async (ids: string[]) => {
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
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
    .where(inArray(calendarItems.id, ids));

  return rows.map(row => ({
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
  }) satisfies CalendarEntry);
};

export async function getCalendarDashboardData(
  options: CalendarDashboardOptions = {},
): Promise<CalendarDashboardData> {
  const session = await getSession();
  if (!session || !session.userId) {
    return { boards: [], calendarItems: [] };
  }

  const boardItemLimit = normalizeLimit(options.boardItemLimit, DEFAULT_BOARD_ITEM_LIMIT);
  const calendarItemLimit = normalizeLimit(options.calendarItemLimit, DEFAULT_CALENDAR_ITEM_LIMIT);
  const timer = createPerfTimer('getCalendarDashboardData', {
    boardItemLimit,
    calendarItemLimit,
  });

  const [boardRows, calendarRows] = await Promise.all([
    db.query.boards.findMany({
      where: eq(boards.userId, session.userId as string),
      columns: {
        id: true,
        name: true,
      },
      orderBy: (board, { desc }) => [desc(board.updatedAt)],
      with: {
        generatedItems: {
          columns: {
            id: true,
            title: true,
            type: true,
            content: true,
            storageKey: true,
            carouselUrls: true,
            createdAt: true,
          },
          orderBy: (items, { desc }) => [desc(items.createdAt)],
          limit: boardItemLimit,
        },
      },
    }),
    db
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
      .orderBy(desc(calendarItems.scheduledFor))
      .limit(calendarItemLimit),
  ]);
  timer.mark('queries_complete', {
    boards: boardRows.length,
    calendarItems: calendarRows.length,
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

  timer.done({
    renderedBoardItems: boardsData.reduce((total, board) => total + board.items.length, 0),
    renderedCalendarItems: calendarData.length,
  });
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

export async function updateCalendarItemAction(payload: {
  calendarItemId: string;
  scheduledFor?: string;
  note?: string | null;
}) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const { calendarItemId, scheduledFor, note } = payload;
  const updates: Record<string, any> = {};

  if (scheduledFor) {
    updates.scheduledFor = parseScheduledDate(scheduledFor);
  }

  if (note !== undefined) {
    updates.note = note?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No updates provided' };
  }

  const [updated] = await db
    .update(calendarItems)
    .set(updates)
    .where(and(eq(calendarItems.id, calendarItemId), eq(calendarItems.userId, session.userId as string)))
    .returning();

  if (!updated) {
    return { success: false, error: 'Calendar entry not found' };
  }

  const hydrated = await hydrateCalendarEntry(updated.id);
  if (!hydrated) {
    return { success: false, error: 'Calendar entry missing' };
  }

  revalidatePath('/profile/dashboard');
  return { success: true, item: hydrated };
}

export async function createCalendarItemsBatchAction(payload: {
  entries: Array<{
    boardId: string;
    itemId: string;
    scheduledFor: string;
    note?: string | null;
  }>;
}) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const entries = payload.entries || [];
  if (entries.length === 0) {
    return { success: false, error: 'No entries provided' };
  }

  const boardIds = Array.from(new Set(entries.map(entry => entry.boardId)));
  const itemIds = Array.from(new Set(entries.map(entry => entry.itemId)));

  const boardRows = await db
    .select({ id: boards.id, name: boards.name })
    .from(boards)
    .where(and(eq(boards.userId, session.userId as string), inArray(boards.id, boardIds)));

  if (boardRows.length !== boardIds.length) {
    return { success: false, error: 'Board ownership mismatch' };
  }

  const itemRows = await db
    .select({ id: generatedItems.id, boardId: generatedItems.boardId })
    .from(generatedItems)
    .where(inArray(generatedItems.id, itemIds));

  const itemBoardMap = new Map(itemRows.map(row => [row.id, row.boardId]));
  for (const entry of entries) {
    if (itemBoardMap.get(entry.itemId) !== entry.boardId) {
      return { success: false, error: 'Item ownership mismatch' };
    }
  }

  const newItems = entries.map(entry => ({
    id: crypto.randomUUID(),
    userId: session.userId as string,
    boardId: entry.boardId,
    itemId: entry.itemId,
    scheduledFor: parseScheduledDate(entry.scheduledFor),
    note: entry.note || null,
  }));

  const inserted = await db.insert(calendarItems).values(newItems).returning({ id: calendarItems.id });
  const insertedIds = inserted.map(row => row.id);
  const hydrated = await hydrateCalendarEntriesByIds(insertedIds);

  revalidatePath('/profile/dashboard');
  return { success: true, items: hydrated };
}

export async function deleteCalendarItemsBatchAction(payload: { ids: string[] }) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const ids = payload.ids || [];
  if (ids.length === 0) {
    return { success: false, error: 'No entries provided' };
  }

  const rows = await db
    .select({ id: calendarItems.id })
    .from(calendarItems)
    .where(and(eq(calendarItems.userId, session.userId as string), inArray(calendarItems.id, ids)));

  if (rows.length === 0) {
    return { success: false, error: 'No entries found' };
  }

  await db
    .delete(calendarItems)
    .where(and(eq(calendarItems.userId, session.userId as string), inArray(calendarItems.id, ids)));

  revalidatePath('/profile/dashboard');
  return { success: true, deletedIds: rows.map(row => row.id) };
}

export async function deleteCalendarItemsForDayAction(payload: { day: string }) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const { day } = payload;
  const { start, end } = getDateRangeFromKey(day);

  const rows = await db
    .select({ id: calendarItems.id })
    .from(calendarItems)
    .where(
      and(
        eq(calendarItems.userId, session.userId as string),
        gte(calendarItems.scheduledFor, start),
        lt(calendarItems.scheduledFor, end),
      ),
    );

  if (rows.length === 0) {
    return { success: false, error: 'No entries found for that day' };
  }

  await db
    .delete(calendarItems)
    .where(
      and(
        eq(calendarItems.userId, session.userId as string),
        gte(calendarItems.scheduledFor, start),
        lt(calendarItems.scheduledFor, end),
      ),
    );

  revalidatePath('/profile/dashboard');
  return { success: true, deletedIds: rows.map(row => row.id) };
}

export async function duplicateCalendarItemsToNextWeekAction(payload: { day: string }) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const { day } = payload;
  const { start, end } = getDateRangeFromKey(day);

  const rows = await db
    .select({
      calendarId: calendarItems.id,
      boardId: calendarItems.boardId,
      itemId: calendarItems.itemId,
      note: calendarItems.note,
      scheduledFor: calendarItems.scheduledFor,
      boardName: boards.name,
      itemTitle: generatedItems.title,
      itemType: generatedItems.type,
      itemContent: generatedItems.content,
      itemStorageKey: generatedItems.storageKey,
      itemCarouselUrls: generatedItems.carouselUrls,
    })
    .from(calendarItems)
    .innerJoin(boards, eq(calendarItems.boardId, boards.id))
    .innerJoin(generatedItems, eq(calendarItems.itemId, generatedItems.id))
    .where(
      and(
        eq(calendarItems.userId, session.userId as string),
        gte(calendarItems.scheduledFor, start),
        lt(calendarItems.scheduledFor, end),
      ),
    );

  if (rows.length === 0) {
    return { success: false, error: 'No entries found for that day' };
  }

  const newEntries = rows.map(row => {
    const nextWeek = new Date(row.scheduledFor);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    return {
      id: crypto.randomUUID(),
      userId: session.userId as string,
      boardId: row.boardId,
      itemId: row.itemId,
      scheduledFor: nextWeek,
      note: row.note ?? null,
    };
  });

  await db.insert(calendarItems).values(newEntries);

  const items: CalendarEntry[] = newEntries.map((entry, index) => {
    const row = rows[index];
    return {
      id: entry.id,
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
      scheduledFor: entry.scheduledFor.toISOString(),
      note: entry.note ?? null,
    };
  });

  revalidatePath('/profile/dashboard');
  return { success: true, items };
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
