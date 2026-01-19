'use server';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { boards, favorites, generatedItems, users } from '@/db/schema';
import type { ShowcaseItem } from '@/types';

const SHOWCASE_ADMIN_EMAIL = 'zorovt18@gmail.com';

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

export async function getShowcaseItemsAction(): Promise<ShowcaseItem[]> {
  const admin = await db.query.users.findFirst({
    where: eq(users.email, SHOWCASE_ADMIN_EMAIL),
    columns: { id: true },
  });

  if (!admin?.id) {
    return [];
  }

  const rows = await db.select({
    favoriteId: favorites.id,
    boardName: boards.name,
    itemId: generatedItems.id,
    itemTitle: generatedItems.title,
    itemType: generatedItems.type,
    itemContent: generatedItems.content,
    itemStorageKey: generatedItems.storageKey,
    itemCarouselUrls: generatedItems.carouselUrls,
    itemMetadata: generatedItems.metadata,
  })
    .from(favorites)
    .innerJoin(generatedItems, eq(favorites.generatedItemId, generatedItems.id))
    .innerJoin(boards, eq(generatedItems.boardId, boards.id))
    .where(eq(favorites.userId, admin.id))
    .orderBy(desc(favorites.createdAt));

  const items = rows.map((row) => {
    const type = row.itemType as ShowcaseItem['type'];
    if (!['image', 'video', 'carousel'].includes(type)) return null;

    const carouselUrls = Array.isArray(row.itemCarouselUrls) ? row.itemCarouselUrls : [];
    const metadata = (row.itemMetadata ?? {}) as Record<string, unknown>;
    const aspectRatio = typeof metadata.aspectRatio === 'string' ? metadata.aspectRatio : null;
    let previewUrl: string | null = null;
    let mediaUrls: string[] = [];

    if (type === 'carousel') {
      mediaUrls = carouselUrls
        .map((url) => resolveCarouselUrl(String(url)))
        .filter((url): url is string => Boolean(url));
      previewUrl = mediaUrls[0] || null;
    } else {
      previewUrl = resolveStorageUrl(row.itemStorageKey) || resolveMediaUrl(row.itemContent);
      if (previewUrl) {
        mediaUrls = [previewUrl];
      }
    }

    if (!previewUrl && mediaUrls.length === 0) return null;

    return {
      id: row.itemId,
      title: row.itemTitle || 'Untitled',
      type,
      previewUrl,
      mediaUrls,
      boardName: row.boardName || null,
      aspectRatio,
    } as ShowcaseItem;
  });

  return items.filter((item): item is ShowcaseItem => Boolean(item));
}
