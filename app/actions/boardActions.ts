
'use server';

import { db } from '@/db';
import { boards, assets, messages, generatedItems, brandIdentities, avatarIdentities, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { Board, ProjectAsset, BrandIdentity, AvatarIdentity } from '@/types';
import { getSession } from './authActions';
import { uploadAsset, uploadGeneratedItem, uploadCarouselSlide, deleteAsset as deleteFromStorage } from '@/services/objectStorageService';

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

export async function createBoard(name: string) {
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
            brandIdentity: true,
            avatarIdentity: true,
        }
    });
    
    if (!board || board.userId !== session.userId) {
        return null;
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
    await assertBoardOwnership(boardId);
    
    const [msg] = await db.insert(messages).values({
        boardId,
        role,
        text
    }).returning();
    revalidatePath('/');
    return msg;
}

export async function saveGeneratedItemAction(boardId: string, item: any) {
    await assertBoardOwnership(boardId);
    
    const itemId = crypto.randomUUID();
    
    // IMPORTANT: Store base64 directly in database - object storage has issues
    // Keep the original content as-is (base64 or URL)
    let dbContent: string | null = item.content;
    let processedCarouselUrls: string[] | null = null;
    
    // For carousels, keep the base64 URLs directly
    if (item.type === 'carousel' && item.carouselUrls && Array.isArray(item.carouselUrls)) {
        processedCarouselUrls = item.carouselUrls;
    }
    
    const [saved] = await db.insert(generatedItems).values({
        id: itemId,
        boardId,
        type: item.type,
        content: dbContent,
        storageKey: null, // Not using object storage - store base64 in content
        carouselUrls: processedCarouselUrls || item.carouselUrls,
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
    
    // Return the saved item directly - content is already base64
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
            const { getAsset } = await import('@/services/objectStorageService');
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
