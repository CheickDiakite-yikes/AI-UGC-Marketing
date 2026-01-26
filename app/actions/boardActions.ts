
'use server';

import { db } from '@/db';
import { boards, assets, messages, storyboards, generatedItems, brandIdentities, avatarIdentities, users, products, productAssets, jobs, favorites, profileAssets, profileProducts, profileProductAssets } from '@/db/schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Board, ProjectAsset, BrandIdentity, AvatarIdentity, Product, ProductAsset, ProductAssetRole, ProfileImportSelection, LongVideoStoryboardPayload, StoryboardStatus, AspectRatio, ImageSize, PlanTier, ExtractedBrandData } from '@/types';
import { getSession } from './authActions';
import { uploadAsset, uploadGeneratedItem, uploadCarouselSlide, deleteAsset as deleteFromStorage, getAsset, downloadAsset } from '@/services/objectStorageService';
import { consumeUsage } from '@/services/usageConsumption';
import { processImageForGemini } from '@/services/imageProcessingService';
import { generateContentServer } from '@/app/actions';
import { Type } from '@google/genai';
import { generateMarketingImage, analyzeAvatarImage } from '@/services/geminiService';
import { getPlanLimits } from '@/services/subscriptionPlans';
import { getRemainingImages } from '@/services/usageLimits';

// Helper to map DB board to Board type
// Note directly returning DB objects, might need mapping if types differ slightly
// but schema.ts was designed to match types.ts

async function assertBoardOwnership(boardId: string) {
    const session = await getSession();
    if (!session || !session.userId) {
        throw new Error('Unauthorized: No active session');
    }
    
    const board = await db.query.boards.findFirst({
        where: eq(boards.id, boardId)
    });
    
    if (!board) {
        throw new Error('Board not found');
    }
    
    if (board.userId !== session.userId) {
        throw new Error('Unauthorized: You do not own this board');
    }
    
    return board;
}

async function assertProductOwnership(productId: string) {
    const product = await db.query.products.findFirst({
        where: eq(products.id, productId)
    });

    if (!product) {
        throw new Error('Product not found');
    }

    if (product.boardId) {
        await assertBoardOwnership(product.boardId);
    }

    return product;
}

async function assertStoryboardOwnership(storyboardId: string) {
    const storyboard = await db.query.storyboards.findFirst({
        where: eq(storyboards.id, storyboardId)
    });

    if (!storyboard) {
        throw new Error('Storyboard not found');
    }

    await assertBoardOwnership(storyboard.boardId);
    return storyboard;
}

function logTrace(traceId: string, message: string, data?: unknown) {
    if (data !== undefined) {
        console.log(`[TRACE ${traceId}] ${message}`, data);
    } else {
        console.log(`[TRACE ${traceId}] ${message}`);
    }
}

async function assertImageQuotaForUser(userId: string, count: number, traceId: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { imagesGenerated: true, planTier: true, creditBalance: true }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const { imageLimit } = getPlanLimits((user.planTier as PlanTier) || 'free');
    const remaining = getRemainingImages(user.imagesGenerated, imageLimit, user.creditBalance || 0);

    if (remaining < count) {
        logTrace(traceId, 'Image quota exceeded', { remaining, requested: count });
        throw new Error('QUOTA_EXCEEDED');
    }
}

export async function getBoards() {
    const session = await getSession();
    if (!session || !session.userId) {
        return [];
    }
    
    const userBoards = await db.query.boards.findMany({
        where: eq(boards.userId, session.userId as string),
        orderBy: [desc(boards.createdAt)],
        with: {
            assets: true,
            generatedItems: true
        }
    });
    
    return userBoards.map(board => ({
        ...board,
        assetCount: board.assets?.length || 0,
        generatedItemCount: board.generatedItems?.length || 0
    }));
}

async function resolveProfileAssetContent(asset: { content: string | null; storageKey: string | null }) {
    if (asset.content) {
        return asset.content;
    }

    if (asset.storageKey) {
        const downloaded = await downloadAsset(asset.storageKey);
        if (downloaded.success && downloaded.data) {
            return downloaded.data.toString('base64');
        }
    }

    return null;
}

async function importProfileLibraryToBoard(
    boardId: string,
    userId: string,
    profileImport: ProfileImportSelection
) {
    const assetIds = Array.from(new Set(profileImport.assetIds || []));
    const productIds = Array.from(new Set(profileImport.productIds || []));
    const importedAssetMap = new Map<string, string>();

    if (profileImport.includeWebsite || profileImport.includeOverview) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { websiteUrl: true, overview: true },
        });

        if (profileImport.includeWebsite && user?.websiteUrl) {
            await saveAsset(boardId, {
                id: crypto.randomUUID(),
                type: 'link',
                name: 'Website',
                content: user.websiteUrl,
                mimeType: undefined,
            });
        }

        if (profileImport.includeOverview && user?.overview) {
            await saveAsset(boardId, {
                id: crypto.randomUUID(),
                type: 'text',
                name: 'Company Overview',
                content: user.overview,
                mimeType: 'text/plain',
            });
        }
    }

    if (assetIds.length > 0) {
        const profileAssetsToImport = await db.query.profileAssets.findMany({
            where: and(eq(profileAssets.userId, userId), inArray(profileAssets.id, assetIds)),
        });

        for (const asset of profileAssetsToImport) {
            const content = await resolveProfileAssetContent({
                content: asset.content,
                storageKey: asset.storageKey,
            });

            if (!content) {
                continue;
            }

            const saved = await saveAsset(boardId, {
                id: asset.id,
                type: asset.type as ProjectAsset['type'],
                name: asset.name,
                content,
                mimeType: asset.mimeType || undefined,
            });

            importedAssetMap.set(asset.id, saved.id);
        }
    }

    if (productIds.length > 0) {
        const profileProductsToImport = await db.query.profileProducts.findMany({
            where: and(eq(profileProducts.userId, userId), inArray(profileProducts.id, productIds)),
        });

        const profileProductAssetsToImport = await db.select({
            profileProductId: profileProductAssets.profileProductId,
            profileAssetId: profileProductAssets.profileAssetId,
            role: profileProductAssets.role,
            isPrimary: profileProductAssets.isPrimary,
            assetName: profileAssets.name,
            assetType: profileAssets.type,
            assetContent: profileAssets.content,
            assetStorageKey: profileAssets.storageKey,
            assetMimeType: profileAssets.mimeType,
        })
            .from(profileProductAssets)
            .innerJoin(profileAssets, eq(profileProductAssets.profileAssetId, profileAssets.id))
            .where(inArray(profileProductAssets.profileProductId, productIds));

        for (const profileProduct of profileProductsToImport) {
            const [createdProduct] = await db.insert(products).values({
                boardId,
                name: profileProduct.name,
                description: profileProduct.description,
                productType: profileProduct.productType,
            }).returning();

            const productAssetsForProduct = profileProductAssetsToImport.filter(
                asset => asset.profileProductId === profileProduct.id
            );

            for (const profileProductAsset of productAssetsForProduct) {
                let boardAssetId = importedAssetMap.get(profileProductAsset.profileAssetId);

                if (!boardAssetId) {
                    const content = await resolveProfileAssetContent({
                        content: profileProductAsset.assetContent,
                        storageKey: profileProductAsset.assetStorageKey,
                    });

                    if (!content) {
                        continue;
                    }

                    const saved = await saveAsset(boardId, {
                        id: profileProductAsset.profileAssetId,
                        type: profileProductAsset.assetType as ProjectAsset['type'],
                        name: profileProductAsset.assetName,
                        content,
                        mimeType: profileProductAsset.assetMimeType || undefined,
                    });

                    boardAssetId = saved.id;
                    importedAssetMap.set(profileProductAsset.profileAssetId, boardAssetId);
                }

                await db.insert(productAssets).values({
                    id: crypto.randomUUID(),
                    productId: createdProduct.id,
                    assetId: boardAssetId,
                    role: profileProductAsset.role,
                    isPrimary: profileProductAsset.isPrimary ?? false,
                    variant: null,
                    notes: null,
                    tags: null,
                });
            }
        }
    }
}

export async function createBoard(name: string, profileImport?: ProfileImportSelection) {
    const session = await getSession();
    if (!session || !session.userId) {
        throw new Error('Unauthorized: Must be logged in to create a board');
    }
    
    const [newBoard] = await db.insert(boards).values({ 
        name, 
        userId: session.userId as string 
    }).returning();

    // Create initial welcome message
    await db.insert(messages).values({
        boardId: newBoard.id,
        role: 'model',
        text: `Campaign "${name}" initialized. How can I help you dominate your market today?`
    });

    if (profileImport) {
        const hasImports = profileImport.includeWebsite
            || profileImport.includeOverview
            || (profileImport.assetIds && profileImport.assetIds.length > 0)
            || (profileImport.productIds && profileImport.productIds.length > 0);
        if (hasImports) {
            await importProfileLibraryToBoard(newBoard.id, session.userId as string, profileImport);
        }
    }

    revalidatePath('/');
    return newBoard;
}

export async function getBoardDetails(boardId: string) {
    const session = await getSession();
    if (!session || !session.userId) {
        return null;
    }
    
    const board = await db.query.boards.findFirst({
        where: eq(boards.id, boardId),
        with: {
            assets: true,
            messages: { orderBy: (messages, { asc }) => [asc(messages.createdAt)] },
            generatedItems: { orderBy: (items, { desc }) => [desc(items.createdAt)] },
            storyboards: { orderBy: (storyboards, { desc }) => [desc(storyboards.createdAt)] },
            brandIdentity: true,
            avatarIdentity: true,
            products: { with: { productAssets: true } },
        }
    });
    
    if (!board || board.userId !== session.userId) {
        return null;
    }

    if (board && board.generatedItems && board.generatedItems.length > 0) {
        const itemIds = board.generatedItems.map(item => item.id);
        const favoriteRows = await db.select({ generatedItemId: favorites.generatedItemId })
            .from(favorites)
            .where(and(
                eq(favorites.userId, session.userId as string),
                inArray(favorites.generatedItemId, itemIds)
            ));

        const favoriteSet = new Set(favoriteRows.map(row => row.generatedItemId));
        board.generatedItems = board.generatedItems.map(item => ({
            ...item,
            isFavorite: favoriteSet.has(item.id)
        }));
    }
    
    if (board && board.assets) {
        board.assets = board.assets.map(asset => {
            if (asset.storageKey) {
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
            let mappedItem = { ...item };
            
            if (item.storageKey) {
                mappedItem.content = `/api/storage/${encodeURIComponent(item.storageKey)}`;
            }
            
            if (item.carouselUrls && Array.isArray(item.carouselUrls)) {
                mappedItem.carouselUrls = item.carouselUrls.map((url: string) => {
                    if (url && !url.startsWith('data:') && !url.startsWith('http') && !url.startsWith('/api/')) {
                        return `/api/storage/${encodeURIComponent(url)}`;
                    }
                    return url;
                });
            }
            
            return mappedItem;
        });
    }
    
    return board;
}

export async function saveAsset(boardId: string, asset: ProjectAsset) {
    await assertBoardOwnership(boardId);
    
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
        extractedText: asset.extractedText || null,
        metadata: asset.metadata || null
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
    await assertBoardOwnership(boardId);
    
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
    await assertBoardOwnership(boardId);
    
    const [savedIdentity] = await db.insert(avatarIdentities).values({
        name: identity.name,
        description: identity.description,
        traits: identity.traits,
        atomicTraits: identity.atomicTraits,
        referenceImages: identity.referenceImages,
        consistencySpec: identity.consistencySpec || null
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

export async function generateAvatarAssetAction(boardId: string, description: string) {
    const traceId = crypto.randomUUID();
    logTrace(traceId, 'Avatar generation requested', { boardId });

    try {
        const session = await getSession();
        if (!session || !session.userId) {
            return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED', traceId };
        }

        await assertBoardOwnership(boardId);
        await assertImageQuotaForUser(session.userId as string, 1, traceId);

        const trimmed = description.trim();
        if (!trimmed) {
            return { success: false, error: 'Missing avatar description', code: 'INVALID_INPUT', traceId };
        }

        const avatarPrompt = [
            'Photorealistic portrait of a single person, waist-up framing.',
            'Neutral background, even natural lighting, sharp facial details.',
            'No text, no logos, no props, no extra people.',
            `Description: ${trimmed}`
        ].join('\n');

        const dataUrl = await generateMarketingImage(avatarPrompt, AspectRatio.SQUARE, ImageSize.ONE_K);
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        if (!base64) {
            throw new Error('Missing avatar image data');
        }

        const savedAsset = await saveAsset(boardId, {
            id: crypto.randomUUID(),
            type: 'avatar',
            name: 'AI Avatar',
            content: base64,
            mimeType: 'image/png',
        });
        logTrace(traceId, 'Avatar asset saved', { assetId: savedAsset.id });

        const identity = await analyzeAvatarImage([base64]);
        logTrace(traceId, 'Avatar identity generated', { traitCount: identity.traits?.length || 0 });

        try {
            await consumeUsage(session.userId as string, 'image', 1);
        } catch (error) {
            console.warn(`[AVATAR ${traceId}] Failed to apply usage charge`, error);
        }

        return { success: true, asset: savedAsset, identity, traceId };
    } catch (error: any) {
        const message = error?.message || 'Avatar generation failed';
        const code = message === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED' : undefined;
        logTrace(traceId, 'Avatar generation failed', { error: message });
        return { success: false, error: message, code, traceId };
    }
}

type ProductInput = Omit<Product, 'id' | 'boardId' | 'assets' | 'createdAt'>;
type ProductAssetInput = Omit<ProductAsset, 'id' | 'productId' | 'createdAt'>;

export async function createProductAction(boardId: string, product: ProductInput) {
    await assertBoardOwnership(boardId);

    const [created] = await db.insert(products).values({
        boardId,
        name: product.name,
        description: product.description || null,
        category: product.category || null,
        productType: product.productType,
        platforms: product.platforms || null,
        digitalSubtype: product.digitalSubtype || null,
        keyFeatures: product.keyFeatures || null,
        variants: product.variants || null,
        complianceNotes: product.complianceNotes || null,
        visualSpec: product.visualSpec || null,
        copySpec: product.copySpec || null
    }).returning();

    revalidatePath('/');
    return created;
}

export async function updateProductAction(productId: string, updates: Partial<ProductInput>) {
    const product = await assertProductOwnership(productId);

    const [updated] = await db.update(products)
        .set({
            name: updates.name ?? product.name,
            description: updates.description ?? product.description,
            category: updates.category ?? product.category,
            productType: updates.productType ?? product.productType,
            platforms: updates.platforms ?? product.platforms,
            digitalSubtype: updates.digitalSubtype ?? product.digitalSubtype,
            keyFeatures: updates.keyFeatures ?? product.keyFeatures,
            variants: updates.variants ?? product.variants,
            complianceNotes: updates.complianceNotes ?? product.complianceNotes,
            visualSpec: updates.visualSpec ?? product.visualSpec,
            copySpec: updates.copySpec ?? product.copySpec
        })
        .where(eq(products.id, productId))
        .returning();

    revalidatePath('/');
    return updated;
}

export async function deleteProductAction(productId: string) {
    await assertProductOwnership(productId);

    await db.delete(products).where(eq(products.id, productId));
    revalidatePath('/');
    return { success: true };
}

export async function setProductAssetsAction(productId: string, assignments: ProductAssetInput[]) {
    const product = await assertProductOwnership(productId);

    const assetIds = assignments.map(a => a.assetId);
    const validAssets = assetIds.length > 0 ? await db.select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.boardId, product.boardId), inArray(assets.id, assetIds))) : [];

    const validAssetIds = new Set(validAssets.map(a => a.id));

    await db.delete(productAssets).where(eq(productAssets.productId, productId));

    const rows = assignments
        .filter(a => validAssetIds.has(a.assetId))
        .map(a => ({
            id: crypto.randomUUID(),
            productId,
            assetId: a.assetId,
            role: a.role,
            isPrimary: a.isPrimary ?? false,
            variant: a.variant || null,
            notes: a.notes || null,
            tags: a.tags || null
        }));

    if (rows.length > 0) {
        await db.insert(productAssets).values(rows);
    }

    revalidatePath('/');
    return { success: true };
}

export async function saveMessageAction(
    boardId: string,
    role: 'user' | 'model' | 'system',
    text: string,
    messageId?: string,
    groundingLinks?: { title: string; url: string }[]
) {
    await assertBoardOwnership(boardId);

    const values: any = { boardId, role, text };
    if (messageId) {
        values.id = messageId;
    }
    if (groundingLinks && groundingLinks.length > 0) {
        values.groundingLinks = groundingLinks;
    }

    const [msg] = await db.insert(messages).values(values).returning();
    revalidatePath('/');
    return msg;
}

export async function createStoryboardAction(
    boardId: string,
    input: {
        id: string;
        messageId?: string | null;
        payload: LongVideoStoryboardPayload;
        totalDurationSeconds: number;
        status?: StoryboardStatus;
    }
) {
    const session = await getSession();
    if (!session || !session.userId) {
        throw new Error('Unauthorized: Must be logged in to create a storyboard');
    }

    await assertBoardOwnership(boardId);

    const now = new Date();
    const [saved] = await db.insert(storyboards).values({
        id: input.id,
        boardId,
        userId: session.userId as string,
        messageId: input.messageId || null,
        status: input.status || 'pending',
        payload: input.payload,
        totalDurationSeconds: input.totalDurationSeconds,
        createdAt: now,
        updatedAt: now
    }).returning();

    revalidatePath('/');
    return saved;
}

export async function updateStoryboardStatusAction(storyboardId: string, status: StoryboardStatus) {
    await assertStoryboardOwnership(storyboardId);
    const [updated] = await db.update(storyboards)
        .set({ status, updatedAt: new Date() })
        .where(eq(storyboards.id, storyboardId))
        .returning();
    revalidatePath('/');
    return updated;
}

export async function updateStoryboardPayloadAction(storyboardId: string, payload: LongVideoStoryboardPayload) {
    const traceId = crypto.randomUUID();
    logTrace(traceId, 'Updating storyboard payload', {
        storyboardId,
        referenceMode: payload.referenceMode || null,
        referenceCount: Array.isArray(payload.referenceSelections) ? payload.referenceSelections.length : 0
    });
    try {
        await assertStoryboardOwnership(storyboardId);
        const [updated] = await db.update(storyboards)
            .set({ payload, updatedAt: new Date() })
            .where(eq(storyboards.id, storyboardId))
            .returning();
        revalidatePath('/');
        return updated;
    } catch (error: any) {
        logTrace(traceId, 'Failed to update storyboard payload', { error: error?.message || error });
        throw error;
    }
}

export async function saveGeneratedItemAction(boardId: string, item: any) {
    await assertBoardOwnership(boardId);
    
    const itemId = crypto.randomUUID();
    
    let storageKey: string | null = null;
    let dbContent: string | null = null;
    let processedCarouselUrls: string[] | null = null;
    
    // Upload media to object storage for better performance and scalability
    if (item.type === 'image' || item.type === 'video') {
        if (item.content && item.content.startsWith('data:')) {
            console.log(`[STORAGE] Uploading ${item.type} to object storage...`);
            const uploadResult = await uploadGeneratedItem(boardId, itemId, item.content, item.type);
            if (uploadResult.success && uploadResult.storageKey) {
                storageKey = uploadResult.storageKey;
                console.log(`[STORAGE] Uploaded ${item.type}: ${storageKey}`);
            } else {
                console.error(`[STORAGE] Upload failed, falling back to database:`, uploadResult.error);
                dbContent = item.content; // Fallback to database storage
            }
        } else {
            dbContent = item.content; // Non-base64 content goes to database
        }
    } else if (item.type === 'carousel' && item.carouselUrls && Array.isArray(item.carouselUrls)) {
        // Upload each carousel slide to object storage
        const uploadedSlideKeys: string[] = [];
        for (let i = 0; i < item.carouselUrls.length; i++) {
            const slideData = item.carouselUrls[i];
            if (slideData && slideData.startsWith('data:')) {
                const slideResult = await uploadCarouselSlide(boardId, itemId, i, slideData);
                if (slideResult.success && slideResult.storageKey) {
                    uploadedSlideKeys.push(slideResult.storageKey);
                } else {
                    console.error(`[STORAGE] Carousel slide ${i} upload failed:`, slideResult.error);
                    uploadedSlideKeys.push(slideData); // Fallback to base64
                }
            } else {
                uploadedSlideKeys.push(slideData);
            }
        }
        processedCarouselUrls = uploadedSlideKeys;
        
        // Upload cover image (first slide) as the main content
        if (item.content && item.content.startsWith('data:')) {
            const coverResult = await uploadGeneratedItem(boardId, itemId, item.content, 'image');
            if (coverResult.success && coverResult.storageKey) {
                storageKey = coverResult.storageKey;
            } else {
                dbContent = item.content;
            }
        }
    } else {
        dbContent = item.content;
    }
    
    const [saved] = await db.insert(generatedItems).values({
        id: itemId,
        boardId,
        type: item.type,
        content: dbContent,
        storageKey: storageKey,
        carouselUrls: processedCarouselUrls || item.carouselUrls,
        title: item.title,
        description: item.description,
        metadata: item.meta,
        x: item.x || 0,
        y: item.y || 0
    }).returning();

    const session = await getSession();
    if (session && session.userId) {
        const usageType = item.type === 'video' ? 'video' : 'image';
        const count = item.type === 'carousel' && item.carouselUrls ? item.carouselUrls.length : 1;
        try {
            await consumeUsage(session.userId as string, usageType, count);
        } catch (error) {
            console.warn('[SAVE ITEM] Failed to apply usage charge', error);
        }
    }

    revalidatePath('/');
    
    // Return with proper URLs for immediate display
    let returnContent = saved.content;
    let returnCarouselUrls = saved.carouselUrls;
    
    // Convert storage key to API URL for content
    if (saved.storageKey) {
        returnContent = `/api/storage/${encodeURIComponent(saved.storageKey)}`;
    }
    
    // Convert carousel storage keys to API URLs
    if (saved.carouselUrls && Array.isArray(saved.carouselUrls)) {
        returnCarouselUrls = (saved.carouselUrls as string[]).map((url: string) => {
            // If it's a storage key (not a data URL or already an API URL), convert it
            if (url && !url.startsWith('data:') && !url.startsWith('http') && !url.startsWith('/api/')) {
                return `/api/storage/${encodeURIComponent(url)}`;
            }
            return url;
        });
    }
    
    return {
        ...saved,
        content: returnContent,
        carouselUrls: returnCarouselUrls
    };
}

export async function getUserUsageAction() {
    const session = await getSession();
    if (!session || !session.userId) {
        return { imagesGenerated: 0, videosGenerated: 0, creditBalance: 0, lastResetDate: Date.now() };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId as string),
        columns: {
            imagesGenerated: true,
            videosGenerated: true,
            creditBalance: true
        }
    });

    return {
        imagesGenerated: user?.imagesGenerated || 0,
        videosGenerated: user?.videosGenerated || 0,
        creditBalance: user?.creditBalance || 0,
        lastResetDate: Date.now() // We could store this in DB too if needed
    };
}

export async function getOnboardingStateAction() {
    const session = await getSession();
    if (!session || !session.userId) {
        return {
            completed: true,
            dismissed: false,
            required: { websiteLink: true, campaignCreated: true },
            optional: { logo: true, avatar: true, product: true, sources: true, multipleBoards: true }
        };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId as string),
        columns: { onboardingCompleted: true, onboardingDismissedAt: true, websiteUrl: true }
    });

    const userBoards = await db.query.boards.findMany({
        where: eq(boards.userId, session.userId as string),
        columns: { id: true }
    });

    const boardIds = userBoards.map(board => board.id);
    const assetTypes = boardIds.length > 0
        ? await db.select({ type: assets.type }).from(assets).where(inArray(assets.boardId, boardIds))
        : [];
    const assetTypeSet = new Set(assetTypes.map(asset => asset.type));

    const hasWebsiteLink = Boolean(user?.websiteUrl);
    const hasLogo = assetTypeSet.has('logo');
    const hasAvatar = assetTypeSet.has('avatar');
    const hasSources = assetTypeSet.has('pdf') || assetTypeSet.has('text');

    const hasProduct = boardIds.length > 0
        ? (await db.select({ id: products.id }).from(products).where(inArray(products.boardId, boardIds)).limit(1)).length > 0
        : false;

    const hasGeneratedItem = boardIds.length > 0
        ? (await db.select({ id: generatedItems.id }).from(generatedItems).where(inArray(generatedItems.boardId, boardIds)).limit(1)).length > 0
        : false;

    const hasGenerationJob = (await db.select({ id: jobs.id }).from(jobs).where(
        and(
            eq(jobs.userId, session.userId as string),
            inArray(jobs.type, ['generate_image', 'generate_video', 'generate_carousel'])
        )
    ).limit(1)).length > 0;

    const hasCampaign = hasGeneratedItem || hasGenerationJob;
    const hasMultipleBoards = userBoards.length > 1;

    const requiredComplete = hasWebsiteLink && hasCampaign;
    let completed = Boolean(user?.onboardingCompleted);

    if (!completed && requiredComplete) {
        await db.update(users)
            .set({ onboardingCompleted: true, onboardingCompletedAt: new Date(), onboardingDismissedAt: null })
            .where(eq(users.id, session.userId as string));
        completed = true;
    }

    return {
        completed,
        dismissed: Boolean(user?.onboardingDismissedAt) && !completed,
        required: {
            websiteLink: hasWebsiteLink,
            campaignCreated: hasCampaign
        },
        optional: {
            logo: hasLogo,
            avatar: hasAvatar,
            product: hasProduct,
            sources: hasSources,
            multipleBoards: hasMultipleBoards
        }
    };
}

export async function dismissOnboardingAction(): Promise<void> {
    const session = await getSession();
    if (!session || !session.userId) {
        return;
    }

    await db.update(users)
        .set({ onboardingDismissedAt: new Date() })
        .where(eq(users.id, session.userId as string));

    revalidatePath('/');
    revalidatePath('/profile');
}

export async function resumeOnboardingAction(): Promise<void> {
    const session = await getSession();
    if (!session || !session.userId) {
        return;
    }

    await db.update(users)
        .set({ onboardingDismissedAt: null })
        .where(eq(users.id, session.userId as string));

    revalidatePath('/');
    revalidatePath('/profile');
}

export async function completeOnboardingAction(): Promise<void> {
    const session = await getSession();
    if (!session || !session.userId) {
        return;
    }

    await db.update(users)
        .set({ onboardingCompleted: true, onboardingCompletedAt: new Date(), onboardingDismissedAt: null })
        .where(eq(users.id, session.userId as string));

    revalidatePath('/');
    revalidatePath('/profile');
}

export async function resetOnboardingAction(): Promise<void> {
    const session = await getSession();
    if (!session || !session.userId) {
        return;
    }

    await db.update(users)
        .set({ onboardingCompleted: false, onboardingCompletedAt: null, onboardingDismissedAt: null, websiteUrl: null })
        .where(eq(users.id, session.userId as string));

    revalidatePath('/');
    revalidatePath('/profile');
    redirect('/');
}

export async function analyzeLogoAction(formData: FormData): Promise<{ success: boolean; logoUrl?: string; colors?: string[]; error?: string }> {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Not authenticated' };
    }

    const logoFile = formData.get('logo') as File | null;
    if (!logoFile || logoFile.size === 0) {
        return { success: false, error: 'No logo file provided' };
    }

    try {
        const { uploadUserLogo, getPublicUrl } = await import('@/services/objectStorageService');
        
        const arrayBuffer = await logoFile.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const logoId = crypto.randomUUID();
        const mimeType = logoFile.type || 'image/png';
        
        const uploadResult = await uploadUserLogo(session.userId as string, logoId, base64Data, mimeType);
        if (!uploadResult.success || !uploadResult.storageKey) {
            return { success: false, error: uploadResult.error || 'Failed to upload logo' };
        }

        const logoUrl = await getPublicUrl(uploadResult.storageKey);
        
        const colorPrompt = `Analyze this logo image and extract the dominant brand colors.

Return a JSON object with exactly this structure:
{
  "colors": ["#HEXCODE1", "#HEXCODE2", ...]
}

Rules:
- Extract 3-6 dominant colors as hex codes
- Order from most dominant to least dominant
- Include the primary brand color first
- Exclude pure black (#000000) and pure white (#FFFFFF) unless they are clearly part of the brand
- Return valid JSON only`;

        const { generateContentServer } = await import('@/app/actions');
        const colorResponse = await generateContentServer([
            { text: colorPrompt },
            { inlineData: { mimeType, data: base64Data } }
        ]);

        let colors: string[] = [];
        if (colorResponse.text) {
            let jsonText = colorResponse.text.trim();
            if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
            if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
            if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
            jsonText = jsonText.trim();
            try {
                const parsed = JSON.parse(jsonText);
                if (Array.isArray(parsed.colors)) {
                    colors = parsed.colors.filter((c: string) => /^#[0-9A-Fa-f]{6}$/.test(c)).slice(0, 6);
                }
            } catch {
                console.error('[ANALYZE_LOGO] Failed to parse colors:', jsonText);
            }
        }

        return { success: true, logoUrl, colors };
    } catch (error: any) {
        console.error('[ANALYZE_LOGO] Failed:', error);
        return { success: false, error: error.message || 'Failed to analyze logo' };
    }
}

export async function analyzeWebsiteAction(
    url: string,
    logoFormData?: FormData
): Promise<{ success: boolean; data?: ExtractedBrandData; error?: string; logoUrl?: string }> {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Not authenticated' };
    }

    let logoResult: { logoUrl?: string; colors?: string[] } = {};
    
    if (logoFormData) {
        const result = await analyzeLogoAction(logoFormData);
        if (result.success) {
            logoResult = { logoUrl: result.logoUrl, colors: result.colors };
        }
    }

    if (!url) {
        if (logoResult.logoUrl) {
            const fallbackData: ExtractedBrandData = {
                companyName: 'Your Company',
                description: 'Add your company description in Company settings',
                industry: 'Your Industry',
                keyOfferings: ['Your products or services'],
                targetAudience: 'Your target customers',
                brandColors: logoResult.colors || [],
            };
            return { success: true, data: fallbackData, logoUrl: logoResult.logoUrl };
        }
        return { success: false, error: 'Please provide a website URL or upload a logo' };
    }

    try {
        new URL(url);
    } catch {
        return { success: false, error: 'Invalid URL format' };
    }

    const TIMEOUT_MS = 45000;
    const prompt = `You are analyzing a company website. Extract all available brand information from the page content.

Return a JSON object with these fields:

REQUIRED (always include):
- companyName: The company or brand name
- description: A 2-3 sentence overview of what the company does
- industry: The primary industry or sector
- keyOfferings: Array of 3-5 main products or services
- targetAudience: Who the company primarily serves

OPTIONAL (include if you can find them on the website):
- tagline: The brand's tagline, slogan, or motto (look in headers, hero sections)
- brandColors: Primary brand colors as hex codes, extract from the website's design (array like ["#FF5500", "#1A1A1A"])
- socialLinks: Social media links found in footer or header (array of {platform: "twitter", url: "..."})
- contactEmail: Contact email address if visible
- missionStatement: Company mission, vision, or "about us" statement
- foundedYear: Year founded if mentioned (as string like "2020")
- teamSize: Company size if mentioned (like "50-100 employees" or "Enterprise")

Look carefully at:
- The page header and hero section for tagline
- Footer for social links and contact info
- About page content for mission and founding info
- CSS/design for brand colors

Return valid JSON only.`;

    try {
        const { generateContentWithUrlContext } = await import('@/app/actions');
        
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Analysis timed out')), TIMEOUT_MS);
        });

        const analysisPromise = (async () => {
            const urlResponse = await generateContentWithUrlContext(url, prompt);
            
            if (!urlResponse.text) {
                throw new Error('No response from AI');
            }
            
            let jsonText = urlResponse.text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7);
            }
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3);
            }
            if (jsonText.endsWith('```')) {
                jsonText = jsonText.slice(0, -3);
            }
            jsonText = jsonText.trim();
            
            return JSON.parse(jsonText) as ExtractedBrandData;
        })();

        const data = await Promise.race([analysisPromise, timeoutPromise]);
        
        if (!data.companyName || !data.description) {
            return { success: false, error: 'Could not extract brand information' };
        }

        if (logoResult.colors && logoResult.colors.length > 0) {
            const websiteColors = data.brandColors || [];
            const mergedColors = [...logoResult.colors];
            for (const color of websiteColors) {
                if (!mergedColors.includes(color) && mergedColors.length < 8) {
                    mergedColors.push(color);
                }
            }
            data.brandColors = mergedColors;
        }

        return { success: true, data, logoUrl: logoResult.logoUrl };
    } catch (error: any) {
        console.error('[ANALYZE_WEBSITE] Failed:', error);
        if (error.message === 'Analysis timed out') {
            return { success: false, error: 'Analysis took too long. Please try again.', logoUrl: logoResult.logoUrl };
        }
        return { success: false, error: error.message || 'Failed to analyze website', logoUrl: logoResult.logoUrl };
    }
}

export async function submitWebsiteOnboardingAction(
    websiteUrl: string,
    data?: ExtractedBrandData,
    logoUrl?: string
): Promise<{ success: boolean; error?: string }> {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Not authenticated' };
    }

    if (websiteUrl) {
        try {
            new URL(websiteUrl);
        } catch {
            return { success: false, error: 'Invalid URL format' };
        }
    }

    const userBoards = await db.query.boards.findMany({
        where: eq(boards.userId, session.userId as string),
        orderBy: [desc(boards.createdAt)],
        limit: 1
    });

    let boardId: string;
    if (userBoards.length > 0) {
        boardId = userBoards[0].id;
    } else {
        const [newBoard] = await db.insert(boards)
            .values({
                name: 'My First Campaign',
                userId: session.userId as string,
            })
            .returning();
        boardId = newBoard.id;
    }

    if (websiteUrl) {
        const existingLink = await db.query.assets.findFirst({
            where: and(
                eq(assets.boardId, boardId),
                eq(assets.type, 'link')
            )
        });

        if (!existingLink) {
            await db.insert(assets).values({
                boardId,
                type: 'link',
                name: websiteUrl,
                content: websiteUrl,
            });
        }
    }

    const updateData: Record<string, any> = {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        onboardingDismissedAt: null
    };

    if (websiteUrl) {
        updateData.websiteUrl = websiteUrl;
    }

    if (data) {
        updateData.company = data.companyName;
        updateData.overview = data.description;
        updateData.brandContext = {
            companyName: data.companyName,
            description: data.description,
            industry: data.industry,
            keyOfferings: data.keyOfferings,
            targetAudience: data.targetAudience,
            tagline: data.tagline || null,
            brandColors: data.brandColors || [],
            socialLinks: data.socialLinks || [],
            contactEmail: data.contactEmail || null,
            missionStatement: data.missionStatement || null,
            foundedYear: data.foundedYear || null,
            teamSize: data.teamSize || null,
            logoUrl: logoUrl || null,
            autoDetected: true,
            detectedAt: new Date().toISOString(),
        };
    } else if (logoUrl) {
        updateData.brandContext = {
            logoUrl,
            autoDetected: false,
        };
    }

    await db.update(users)
        .set(updateData)
        .where(eq(users.id, session.userId as string));

    revalidatePath('/');
    revalidatePath('/profile');
    revalidatePath('/profile/company');

    return { success: true };
}

export async function renameBoard(boardId: string, newName: string) {
    await assertBoardOwnership(boardId);
    
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
    await assertBoardOwnership(boardId);
    
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
    
    // Verify ownership through the board
    if (asset.boardId) {
        await assertBoardOwnership(asset.boardId);
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
    
    // Verify ownership through the board
    if (item.boardId) {
        await assertBoardOwnership(item.boardId);
    }
    
    if (item.storageKey) {
        await deleteFromStorage(item.storageKey);
    }
    
    await db.delete(generatedItems).where(eq(generatedItems.id, itemId));
    revalidatePath('/');
    return { success: true };
}

const AUTO_TAG_MODEL = 'gemini-2.5-flash';
const AUTO_TAG_MATCH_THRESHOLD = 0.75;

export async function autoTagAssetAction(assetId: string) {
    const traceId = crypto.randomUUID();
    logTrace(traceId, `Auto-tag start for asset ${assetId}`);

    try {
        const asset = await db.query.assets.findFirst({
            where: eq(assets.id, assetId)
        });

        if (!asset) {
            logTrace(traceId, 'Asset not found');
            return { success: false, error: 'Asset not found', traceId };
        }

        if (asset.boardId) {
            await assertBoardOwnership(asset.boardId);
        }

        if (asset.type !== 'image' && asset.type !== 'logo') {
            logTrace(traceId, `Skipping auto-tag for non-image asset type ${asset.type}`);
            return { success: false, error: 'Asset is not an image', traceId };
        }

        let rawBase64: string | null = asset.content;
        if (!rawBase64 && asset.storageKey) {
            const result = await getAsset(asset.storageKey);
            if (result.success && result.data) {
                rawBase64 = result.data;
            }
        }

        if (!rawBase64) {
            logTrace(traceId, 'No image data available for asset');
            return { success: false, error: 'No image content found', traceId };
        }

        // Process image: detect correct MIME type and resize if needed
        const processed = await processImageForGemini(rawBase64, asset.mimeType, traceId);
        logTrace(traceId, `Image processed: ${processed.originalSize} -> ${processed.processedSize} bytes, mime: ${processed.mimeType}`);

        const boardProducts = asset.boardId ? await db.query.products.findMany({
            where: eq(products.boardId, asset.boardId)
        }) : [];

        const productContext = boardProducts.length > 0
            ? boardProducts.map(p => `- ${p.id}: ${p.name} (${p.productType}) ${p.description ? `- ${p.description}` : ''}`).join('\n')
            : 'None';

        const prompt = `
You are an expert product asset tagging assistant for marketing teams.
Analyze the image and return JSON only, following the provided schema.

Existing products on this board:
${productContext}

Tagging rules:
- If the image is a product, packaging, or UI screenshot, set isProductAsset = true.
- Choose the best role from: product_shot, packaging, mockup, screenshot, in_use, lifestyle, hero, logo, ui, other.
- If this matches an existing product, set matchedProductId and matchConfidence.
- Only choose matchedProductId if you are confident (>= 0.70).
`;

        const response: any = await generateContentServer(AUTO_TAG_MODEL, {
            parts: [
                { inlineData: { mimeType: processed.mimeType, data: processed.base64 } },
                { text: prompt }
            ]
        }, {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isProductAsset: { type: Type.BOOLEAN },
                    productNameGuess: { type: Type.STRING },
                    productType: { type: Type.STRING },
                    role: { type: Type.STRING },
                    variant: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    matchedProductId: { type: Type.STRING },
                    matchConfidence: { type: Type.NUMBER },
                    notes: { type: Type.STRING }
                },
                required: ['isProductAsset', 'confidence']
            }
        });

        if (!response.text) {
            logTrace(traceId, 'Auto-tag response missing text');
            return { success: false, error: 'No auto-tag response', traceId };
        }

        const autoTags = JSON.parse(response.text);
        const existingMetadata = (typeof asset.metadata === 'object' && asset.metadata !== null) ? asset.metadata : {};
        const updatedMetadata = {
            ...existingMetadata,
            autoTags
        };

        await db.update(assets)
            .set({ metadata: updatedMetadata })
            .where(eq(assets.id, assetId));

        logTrace(traceId, 'Auto-tag metadata saved', autoTags);

        let assignedProductId: string | null = null;
        const matchConfidence = typeof autoTags?.matchConfidence === 'number' ? autoTags.matchConfidence : 0;
        const allowedRoles = new Set([
            'product_shot',
            'packaging',
            'mockup',
            'screenshot',
            'in_use',
            'lifestyle',
            'hero',
            'logo',
            'ui',
            'other'
        ]);
        const normalizedRole = allowedRoles.has(autoTags?.role) ? autoTags.role : 'other';

        if (autoTags?.isProductAsset && autoTags?.matchedProductId && matchConfidence >= AUTO_TAG_MATCH_THRESHOLD) {
            const matchedProduct = boardProducts.find(p => p.id === autoTags.matchedProductId);
            if (matchedProduct) {
                const existingAssignment = await db.query.productAssets.findFirst({
                    where: and(
                        eq(productAssets.productId, matchedProduct.id),
                        eq(productAssets.assetId, assetId)
                    )
                });

                if (existingAssignment) {
                    await db.update(productAssets)
                        .set({
                            role: normalizedRole as ProductAssetRole,
                            variant: autoTags.variant || null,
                            notes: autoTags.notes || null
                        })
                        .where(eq(productAssets.id, existingAssignment.id));
                } else {
                    await db.insert(productAssets).values({
                        id: crypto.randomUUID(),
                        productId: matchedProduct.id,
                        assetId,
                        role: normalizedRole as ProductAssetRole,
                        isPrimary: false,
                        variant: autoTags.variant || null,
                        notes: autoTags.notes || null
                    });
                }

                assignedProductId = matchedProduct.id;
                logTrace(traceId, `Auto-assigned asset to product ${matchedProduct.id}`);
            }
        }

        revalidatePath('/');
        return { success: true, autoTags, assignedProductId, traceId };
    } catch (error: any) {
        logTrace(traceId, 'Auto-tag failed', error?.message || error);
        return { success: false, error: error.message || 'Auto-tag failed', traceId };
    }
}

const PRODUCT_ANALYSIS_MODEL = 'gemini-2.5-flash';
const MAX_PRODUCT_IMAGES = 6;

export async function analyzeProductImagesAction(boardId: string, assetIds: string[]) {
    const traceId = crypto.randomUUID();
    logTrace(traceId, `Product image analysis start`, { boardId, assetIds: assetIds.length });

    try {
        await assertBoardOwnership(boardId);

        if (!assetIds || assetIds.length === 0) {
            return { success: false, error: 'No assets provided', traceId };
        }

        const assetsToAnalyze = await db
            .select({
                id: assets.id,
                name: assets.name,
                content: assets.content,
                storageKey: assets.storageKey,
                mimeType: assets.mimeType
            })
            .from(assets)
            .where(and(eq(assets.boardId, boardId), inArray(assets.id, assetIds)));

        if (assetsToAnalyze.length === 0) {
            return { success: false, error: 'Assets not found', traceId };
        }

        const limitedAssets = assetsToAnalyze.slice(0, MAX_PRODUCT_IMAGES);
        const buildParts = async (assetList: typeof limitedAssets) => {
            const parts: any[] = [];
            for (const asset of assetList) {
                let rawBase64: string | null = asset.content;
                if (!rawBase64 && asset.storageKey) {
                    const result = await getAsset(asset.storageKey);
                    if (result.success && result.data) {
                        rawBase64 = result.data;
                    }
                }

                if (!rawBase64) {
                    logTrace(traceId, `Skipping asset ${asset.id}: no image data`);
                    continue;
                }

                try {
                    // Process image: detect correct MIME type and resize if needed
                    const processed = await processImageForGemini(rawBase64, asset.mimeType, traceId);
                    logTrace(traceId, `Asset ${asset.id} processed: ${processed.originalSize} -> ${processed.processedSize} bytes`);
                    
                    parts.push({ text: `ASSET_ID: ${asset.id} | NAME: ${asset.name}` });
                    parts.push({ inlineData: { mimeType: processed.mimeType, data: processed.base64 } });
                } catch (err) {
                    logTrace(traceId, `Failed to process asset ${asset.id}: ${err}`);
                    continue;
                }
            }
            return parts;
        };

        const attempts = [limitedAssets, limitedAssets.slice(0, 3)];
        let analysisResponse: any = null;
        let analysisError: string | null = null;

        for (const assetList of attempts) {
            const parts = await buildParts(assetList);
            if (parts.length === 0) {
                analysisError = 'No image bytes available';
                continue;
            }

            const prompt = `
You are a product intelligence analyst for marketing teams.
Analyze the product images provided and return JSON that matches the schema.

Goals:
- Identify product name, category, and type.
- Identify platforms (web, ios, android, desktop, api, extension, other) and digitalSubtype if applicable.
- Extract likely key features and variants visible in packaging or UI.
- Provide compliance notes if the product is regulated (health, finance, medical, etc.).
- For each ASSET_ID, assign a role and notes (front label, back, side, hero, etc.).
- Extract exact on-pack or on-screen text into labelText (case-sensitive).
- Note any immutable visual identifiers (logo placement, color blocking, cap shape, UI layout).

Allowed productType values:
- physical_product
- software
- service
- digital_product
- hardware

Allowed platforms:
- web
- ios
- android
- desktop
- api
- extension
- other

Allowed digitalSubtype values:
- SaaS
- mobile_app
- course
- coin_token
- marketplace
- community
- newsletter
- template
- dataset
- AI_tool
- other

Allowed asset roles:
- product_shot
- packaging
- mockup
- screenshot
- in_use
- lifestyle
- hero
- logo
- ui
- other

If you cannot determine a field, leave it empty.

Return detailed Visual Spec and Copy Spec to ensure visual and messaging consistency.
Visual Spec should capture physical shape, colors, materials, label text, and do-not-change rules.
Copy Spec should capture canonical naming, tagline, approved claims, proof points, and language to avoid.
`;

            const contents = [{
                role: 'user',
                parts: [{ text: prompt }, ...parts]
            }];

            try {
                analysisResponse = await generateContentServer(PRODUCT_ANALYSIS_MODEL, contents, {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            category: { type: Type.STRING },
                            productType: { type: Type.STRING },
                            platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
                            digitalSubtype: { type: Type.STRING },
                            keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                            variants: { type: Type.ARRAY, items: { type: Type.STRING } },
                            complianceNotes: { type: Type.STRING },
                            visualSpec: {
                                type: Type.OBJECT,
                                properties: {
                                    dominantColors: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    formFactor: { type: Type.STRING },
                                    packagingGeometry: { type: Type.STRING },
                                    labelText: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    logoPlacement: { type: Type.STRING },
                                    distinctiveMarkers: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    usageContexts: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    doNotChange: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            },
                            copySpec: {
                                type: Type.OBJECT,
                                properties: {
                                    canonicalName: { type: Type.STRING },
                                    tagline: { type: Type.STRING },
                                    allowedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    disallowedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    proofPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    toneDirectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    requiredPhrases: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            },
                            assetAssignments: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        assetId: { type: Type.STRING },
                                        role: { type: Type.STRING },
                                        isPrimary: { type: Type.BOOLEAN },
                                        variant: { type: Type.STRING },
                                        notes: { type: Type.STRING },
                                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    },
                                    required: ['assetId', 'role']
                                }
                            }
                        },
                        required: []
                    }
                });
                analysisError = null;
                break;
            } catch (error: any) {
                analysisError = error?.message || 'Analysis failed';
                logTrace(traceId, 'Analysis attempt failed, retrying with fewer images', analysisError);
            }
        }

        if (!analysisResponse?.text) {
            return { success: false, error: analysisError || 'No analysis output', traceId };
        }

        const analysis = JSON.parse(analysisResponse.text);
        logTrace(traceId, 'Product image analysis complete', analysis);

        return { success: true, analysis, traceId };
    } catch (error: any) {
        logTrace(traceId, 'Product image analysis failed', error?.message || error);
        return { success: false, error: error.message || 'Product image analysis failed', traceId };
    }
}

export async function reExtractPdfAction(assetId: string) {
    try {
        const asset = await db.query.assets.findFirst({
            where: eq(assets.id, assetId)
        });
        
        if (!asset) {
            return { success: false, error: 'Asset not found' };
        }
        
        if (asset.type !== 'pdf') {
            return { success: false, error: 'Asset is not a PDF' };
        }
        
        let base64Content: string | null = asset.content;
        
        if (!base64Content && asset.storageKey) {
            const result = await getAsset(asset.storageKey);
            if (result.success && result.data) {
                base64Content = result.data;
            }
        }
        
        if (!base64Content) {
            return { success: false, error: 'No PDF content available for extraction' };
        }
        
        const { extractTextFromPDF } = await import('@/services/pdfService');
        const extractedText = await extractTextFromPDF(base64Content);
        
        if (!extractedText || extractedText.trim().length === 0) {
            return { success: false, error: 'Failed to extract text from PDF - document may be image-based or empty' };
        }
        
        await db.update(assets)
            .set({ extractedText, status: 'ready' })
            .where(eq(assets.id, assetId));
        
        revalidatePath('/');
        
        return { success: true, extractedText };
    } catch (error: any) {
        console.error('PDF re-extraction error:', error);
        return { success: false, error: error.message || 'Failed to re-extract PDF' };
    }
}

export async function scrapeWebsiteAction(boardId: string, url: string) {
    await assertBoardOwnership(boardId);
    
    try {
        const urlPattern = /^https?:\/\/.+/i;
        if (!urlPattern.test(url)) {
            return { success: false, error: 'Invalid URL. Please enter a valid URL starting with http:// or https://' };
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');

        let extractedText = '';
        
        try {
            const { generateContentWithUrlContext } = await import('@/app/actions');
            
            const extractionPrompt = `You are an expert at extracting business and branding information from websites for marketing purposes.

Analyze the website at the URL provided and extract comprehensive information. Navigate through the main pages if needed.

Please extract and organize the following:

## COMPANY OVERVIEW
- Company/Brand Name
- Tagline/Slogan  
- Mission Statement
- What they do (1-2 sentences)
- Industry/Sector

## PRODUCTS & SERVICES
- List ALL main products or services offered
- Key features or benefits mentioned for each
- Pricing information if available

## BRAND VOICE & MESSAGING
- Tone of voice (professional, casual, playful, etc.)
- Key marketing messages and copy
- Unique value propositions
- Target audience indicators

## VISUAL BRAND INDICATORS
- Colors used on the website
- Style descriptors (modern, vintage, luxury, minimalist, etc.)
- Imagery themes and photography style

## KEY CONTENT FOR MARKETING
- Compelling quotes or statements from the site
- Social proof (testimonials, reviews, case studies, stats, achievements)
- Call-to-action phrases used
- Headlines and hooks used

## TEAM & STORY
- Founder/team information if available
- Company origin story or about us content
- Company values or culture

## CONTACT & SOCIAL
- Contact information (email, phone, address)
- Social media handles and links

Provide an extremely comprehensive extraction that would help a marketing AI create perfectly on-brand content for this company. Include direct quotes where impactful.`;

            const response = await generateContentWithUrlContext(url, extractionPrompt);
            
            if (response.text) {
                extractedText = response.text;
                
                const sources: string[] = [];
                
                if (response.urlContextMetadata) {
                    const metadata = response.urlContextMetadata as any;
                    if (metadata.urlMetadata) {
                        for (const urlData of metadata.urlMetadata) {
                            sources.push(urlData.retrievedUrl || urlData.url);
                        }
                    }
                }
                
                if (response.groundingMetadata) {
                    const metadata = response.groundingMetadata as any;
                    if (metadata.groundingChunks) {
                        for (const chunk of metadata.groundingChunks) {
                            if (chunk.web?.uri) {
                                sources.push(chunk.web.uri);
                            }
                        }
                    }
                }
                
                if (sources.length > 0) {
                    const uniqueSources = [...new Set(sources)];
                    extractedText += `\n\n---\n## Sources Analyzed\n`;
                    for (const src of uniqueSources) {
                        extractedText += `- ${src}\n`;
                    }
                }
            }
        } catch (urlContextError: any) {
            console.error('URL Context extraction failed, falling back to basic fetch:', urlContextError);
            
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; PrediAI/1.0; +https://prediai.com)'
                    }
                });

                if (response.ok) {
                    const html = await response.text();
                    let rawText = html
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .substring(0, 30000);
                    
                    extractedText = `## Raw Website Content\n\n${rawText}\n\n(Note: Advanced extraction failed, showing basic content)`;
                } else {
                    extractedText = `Failed to fetch website content. Status: ${response.status}`;
                }
            } catch (fetchError) {
                extractedText = `Website extraction failed: ${urlContextError.message}`;
            }
        }

        const assetId = crypto.randomUUID();
        const [saved] = await db.insert(assets).values({
            id: assetId,
            boardId,
            type: 'link',
            name: hostname,
            content: url,
            extractedText: extractedText,
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
                content: url,
                extractedText: extractedText,
                mimeType: 'text/plain',
                status: 'ready'
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to scrape website' };
    }
}
