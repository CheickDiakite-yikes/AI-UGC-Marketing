
'use server';

import { db } from '@/db';
import { boards, assets, messages, generatedItems, brandIdentities, avatarIdentities, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { Board, ProjectAsset, BrandIdentity, AvatarIdentity } from '@/types';
import { getSession } from './authActions';
import { uploadAsset } from '@/services/objectStorageService';

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
        status: asset.status || 'ready'
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
    // item matches CanvasItem structure but we need to map to DB
    const [saved] = await db.insert(generatedItems).values({
        boardId,
        type: item.type,
        content: item.content,
        carouselUrls: item.carouselUrls,
        title: item.title,
        description: item.description,
        metadata: item.meta, // Assuming item.meta maps to metadata jsonb
        x: item.x || 0,
        y: item.y || 0
    }).returning();

    // Increment Usage
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

