
'use server';

import { db } from '@/db';
import { boards, assets, messages, generatedItems, brandIdentities, avatarIdentities, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { Board, ProjectAsset, BrandIdentity, AvatarIdentity } from '@/types';
import { getSession } from './authActions';
import { uploadAsset, uploadGeneratedItem, deleteAsset as deleteFromStorage } from '@/services/objectStorageService';

// Helper to map DB board to Board type
// Note directly returning DB objects, might need mapping if types differ slightly
// but schema.ts was designed to match types.ts

export async function getBoards() {
    const allBoards = await db.query.boards.findMany({
        orderBy: [desc(boards.createdAt)]
    });
    // We need to fetch sub-items for the list view if needed, but list usually just needs overview
    // For now return basic info, but Workspace expects full objects.
    // Ideally we only fetch full board when active.
    return allBoards;
}

export async function createBoard(name: string) {
    const [newBoard] = await db.insert(boards).values({ name }).returning();

    // Create initial welcome message
    await db.insert(messages).values({
        boardId: newBoard.id,
        role: 'model',
        text: `Campaign "${name}" initialized. How can I help you dominate your market today?`
    });

    revalidatePath('/');
    return newBoard;
}

export async function getBoardDetails(boardId: string) {
    const board = await db.query.boards.findFirst({
        where: eq(boards.id, boardId),
        with: {
            assets: true,
            messages: { orderBy: (messages, { asc }) => [asc(messages.createdAt)] },
            generatedItems: { orderBy: (items, { desc }) => [desc(items.createdAt)] },
            brandIdentity: true,
            avatarIdentity: true,
        }
    });
    
    if (board && board.assets) {
        board.assets = board.assets.map(asset => {
            if (asset.storageKey && !asset.content) {
                return {
                    ...asset,
                    content: `/api/storage/${encodeURIComponent(asset.storageKey)}`
                };
            }
            return asset;
        });
    }
    
    if (board && board.generatedItems) {
        board.generatedItems = board.generatedItems.map(item => {
            if (item.storageKey && !item.content) {
                return {
                    ...item,
                    content: `/api/storage/${encodeURIComponent(item.storageKey)}`
                };
            }
            return item;
        });
    }
    
    return board;
}

export async function saveAsset(boardId: string, asset: ProjectAsset) {
    const assetId = crypto.randomUUID();
    const isMediaType = ['logo', 'image', 'avatar'].includes(asset.type) && asset.mimeType?.startsWith('image/');
    
    let storageKey: string | null = null;
    let dbContent: string | null = asset.content;
    
    if (isMediaType && asset.content && asset.mimeType) {
        const uploadResult = await uploadAsset(boardId, assetId, asset.content, asset.mimeType);
        if (uploadResult.success && uploadResult.storageKey) {
            storageKey = uploadResult.storageKey;
            dbContent = null;
        }
    }
    
    const [saved] = await db.insert(assets).values({
        id: assetId,
        boardId,
        type: asset.type,
        name: asset.name,
        content: dbContent,
        storageKey,
        mimeType: asset.mimeType,
        status: asset.status || 'ready',
        extractedText: asset.extractedText || null
    }).returning();
    
    revalidatePath('/');
    
    if (saved.storageKey && !saved.content) {
        return {
            ...saved,
            content: `/api/storage/${encodeURIComponent(saved.storageKey)}`
        };
    }
    return saved;
}

export async function saveBrandIdentityAction(boardId: string, identity: BrandIdentity) {
    const [savedIdentity] = await db.insert(brandIdentities).values({
        colors: identity.colors,
        fonts: identity.fonts,
        vibe: identity.vibe
    }).returning();

    await db.update(boards)
        .set({ brandIdentityId: savedIdentity.id })
        .where(eq(boards.id, boardId));

    // Add confirmation message
    await db.insert(messages).values({
        boardId,
        role: 'model',
        text: `✅ Brand DNA extracted. All visuals will now strictly follow this color palette and vibe.`
    });

    revalidatePath('/');
    return savedIdentity;
}

export async function saveAvatarIdentityAction(boardId: string, identity: AvatarIdentity) {
    const [savedIdentity] = await db.insert(avatarIdentities).values({
        name: identity.name,
        description: identity.description,
        traits: identity.traits,
        atomicTraits: identity.atomicTraits,
        referenceImages: identity.referenceImages
    }).returning();

    await db.update(boards)
        .set({ avatarIdentityId: savedIdentity.id })
        .where(eq(boards.id, boardId));

    // Add confirmation message
    await db.insert(messages).values({
        boardId,
        role: 'model',
        text: `👤 **High-Fidelity Calibration Complete.** I have mapped your facial geometry and unique features from all angles. Consistency is now locked.`
    });

    revalidatePath('/');
    return savedIdentity;
}

export async function saveMessageAction(boardId: string, role: 'user' | 'model' | 'system', text: string) {
    const [msg] = await db.insert(messages).values({
        boardId,
        role,
        text
    }).returning();
    revalidatePath('/');
    return msg;
}

export async function saveGeneratedItemAction(boardId: string, item: any) {
    const itemId = crypto.randomUUID();
    const isMediaType = ['image', 'video'].includes(item.type);
    
    let storageKey: string | null = null;
    let dbContent: string | null = item.content;
    
    if (isMediaType && item.content) {
        const isBase64 = item.content.includes('base64') || item.content.includes(',');
        if (isBase64) {
            const uploadResult = await uploadGeneratedItem(boardId, itemId, item.content, item.type);
            if (uploadResult.success && uploadResult.storageKey) {
                storageKey = uploadResult.storageKey;
                dbContent = null;
            }
        }
    }
    
    const [saved] = await db.insert(generatedItems).values({
        id: itemId,
        boardId,
        type: item.type,
        content: dbContent,
        storageKey,
        carouselUrls: item.carouselUrls,
        title: item.title,
        description: item.description,
        metadata: item.meta,
        x: item.x || 0,
        y: item.y || 0
    }).returning();

    const session = await getSession();
    if (session && session.userId) {
        if (item.type === 'video') {
            await db.update(users)
                .set({ videosGenerated: sql`${users.videosGenerated} + 1` })
                .where(eq(users.id, session.userId as string));
        } else {
            await db.update(users)
                .set({ imagesGenerated: sql`${users.imagesGenerated} + 1` })
                .where(eq(users.id, session.userId as string));
        }
    }

    revalidatePath('/');
    
    if (saved.storageKey && !saved.content) {
        return {
            ...saved,
            content: `/api/storage/${encodeURIComponent(saved.storageKey)}`
        };
    }
    return saved;
}

export async function getUserUsageAction() {
    const session = await getSession();
    if (!session || !session.userId) {
        return { imagesGenerated: 0, videosGenerated: 0, lastResetDate: Date.now() };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId as string),
        columns: {
            imagesGenerated: true,
            videosGenerated: true
        }
    });

    return {
        imagesGenerated: user?.imagesGenerated || 0,
        videosGenerated: user?.videosGenerated || 0,
        lastResetDate: Date.now() // We could store this in DB too if needed
    };
}

export async function renameBoard(boardId: string, newName: string) {
    if (!newName || newName.trim() === '') {
        return { error: 'Board name cannot be empty', success: false };
    }

    const [updated] = await db.update(boards)
        .set({ name: newName.trim(), updatedAt: new Date() })
        .where(eq(boards.id, boardId))
        .returning();

    revalidatePath('/');
    return { success: true, board: updated };
}

export async function deleteBoard(boardId: string) {
    await db.delete(boards).where(eq(boards.id, boardId));
    revalidatePath('/');
    return { success: true };
}

export async function deleteAssetAction(assetId: string) {
    const asset = await db.query.assets.findFirst({
        where: eq(assets.id, assetId)
    });
    
    if (!asset) {
        return { success: false, error: 'Asset not found' };
    }
    
    if (asset.storageKey) {
        await deleteFromStorage(asset.storageKey);
    }
    
    await db.delete(assets).where(eq(assets.id, assetId));
    revalidatePath('/');
    return { success: true };
}

export async function deleteGeneratedItemAction(itemId: string) {
    const item = await db.query.generatedItems.findFirst({
        where: eq(generatedItems.id, itemId)
    });
    
    if (!item) {
        return { success: false, error: 'Item not found' };
    }
    
    if (item.storageKey) {
        await deleteFromStorage(item.storageKey);
    }
    
    await db.delete(generatedItems).where(eq(generatedItems.id, itemId));
    revalidatePath('/');
    return { success: true };
}

export async function scrapeWebsiteAction(boardId: string, url: string) {
    try {
        const urlPattern = /^https?:\/\/.+/i;
        if (!urlPattern.test(url)) {
            return { success: false, error: 'Invalid URL. Please enter a valid URL starting with http:// or https://' };
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PrediAI/1.0; +https://prediai.com)'
            }
        });

        if (!response.ok) {
            return { success: false, error: `Failed to fetch URL: ${response.status} ${response.statusText}` };
        }

        const html = await response.text();

        let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();

        text = text.substring(0, 10000);

        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');

        const assetId = crypto.randomUUID();
        const [saved] = await db.insert(assets).values({
            id: assetId,
            boardId,
            type: 'link',
            name: hostname,
            content: text,
            storageKey: null,
            mimeType: 'text/plain',
            status: 'ready'
        }).returning();

        revalidatePath('/');

        return {
            success: true,
            asset: {
                id: saved.id,
                type: 'link' as const,
                name: hostname,
                content: text,
                mimeType: 'text/plain',
                status: 'ready'
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to scrape website' };
    }
}
