'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { boards, favorites, generatedItems } from '@/db/schema';
import { getSession } from './authActions';

type FavoriteItemSummary = {
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'carousel';
  previewUrl: string | null;
};

type FavoriteBoardGroup = {
  boardId: string;
  boardName: string;
  items: FavoriteItemSummary[];
};

function resolveStorageUrl(storageKey?: string | null) {
  if (!storageKey) return null;
  return `/api/storage/${encodeURIComponent(storageKey)}`;
}

function resolveCarouselUrl(url: string) {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('/api/')) {
    return url;
  }
  return `/api/storage/${encodeURIComponent(url)}`;
}

function resolveMediaUrl(content?: string | null) {
  if (!content) return null;
  if (content.startsWith('data:') || content.startsWith('http') || content.startsWith('/api/')) {
    return content;
  }
  return null;
}

async function assertGeneratedItemOwnership(itemId: string, userId: string) {
  const item = await db.select({
    id: generatedItems.id,
    boardId: generatedItems.boardId,
  })
    .from(generatedItems)
    .innerJoin(boards, eq(generatedItems.boardId, boards.id))
    .where(and(eq(generatedItems.id, itemId), eq(boards.userId, userId)))
    .limit(1);

  if (!item.length) {
    throw new Error('Unauthorized: Item not found');
  }
}

export async function toggleFavoriteAction(itemId: string) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  await assertGeneratedItemOwnership(itemId, session.userId as string);

  const existing = await db.query.favorites.findFirst({
    where: and(
      eq(favorites.userId, session.userId as string),
      eq(favorites.generatedItemId, itemId)
    ),
  });

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
    revalidatePath('/profile');
    return { success: true, isFavorite: false };
  }

  await db.insert(favorites).values({
    id: crypto.randomUUID(),
    userId: session.userId as string,
    generatedItemId: itemId,
  });

  revalidatePath('/profile');
  return { success: true, isFavorite: true };
}

export async function getFavoritesByBoardAction(): Promise<FavoriteBoardGroup[]> {
  const session = await getSession();
  if (!session || !session.userId) {
    return [];
  }

  const rows = await db.select({
    favoriteId: favorites.id,
    boardId: boards.id,
    boardName: boards.name,
    itemId: generatedItems.id,
    itemTitle: generatedItems.title,
    itemType: generatedItems.type,
    itemContent: generatedItems.content,
    itemStorageKey: generatedItems.storageKey,
    itemCarouselUrls: generatedItems.carouselUrls,
  })
    .from(favorites)
    .innerJoin(generatedItems, eq(favorites.generatedItemId, generatedItems.id))
    .innerJoin(boards, eq(generatedItems.boardId, boards.id))
    .where(eq(favorites.userId, session.userId as string))
    .orderBy(desc(favorites.createdAt));

  const grouped = new Map<string, FavoriteBoardGroup>();

  for (const row of rows) {
    const boardKey = row.boardId;
    if (!grouped.has(boardKey)) {
      grouped.set(boardKey, {
        boardId: row.boardId,
        boardName: row.boardName,
        items: [],
      });
    }

    const carouselUrls = Array.isArray(row.itemCarouselUrls) ? row.itemCarouselUrls : [];
    let previewUrl: string | null = null;

    if (row.itemType === 'carousel' && carouselUrls.length > 0) {
      previewUrl = resolveCarouselUrl(String(carouselUrls[0]));
    } else if (row.itemType !== 'text') {
      previewUrl = resolveStorageUrl(row.itemStorageKey) || resolveMediaUrl(row.itemContent);
    }

    grouped.get(boardKey)!.items.push({
      id: row.itemId,
      title: row.itemTitle,
      type: row.itemType,
      previewUrl,
    });
  }

  return Array.from(grouped.values());
}
