import { db } from '@/db';
import { assets, products } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getAsset } from './objectStorageService';
import { VideoGenerationReferenceType } from '@google/genai';
import type { VideoGenerationReferenceImage } from '@google/genai';
import sharp from 'sharp';

const ROLE_PRIORITY: Record<string, number> = {
  hero: 100,
  packaging: 95,
  product_shot: 90,
  mockup: 80,
  screenshot: 80,
  ui: 75,
  in_use: 70,
  lifestyle: 60,
  logo: 40,
  other: 10,
};

const SUPPORTED_REFERENCE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_REFERENCE_DIMENSION = 1536;

const detectMimeFromBuffer = (buffer: Buffer): string | null => {
  if (buffer.length < 12) return null;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isWebP = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  if (isPng) return 'image/png';
  if (isJpeg) return 'image/jpeg';
  if (isWebP) return 'image/webp';
  if (isGif) return 'image/gif';
  return null;
};

function logTrace(traceId: string, message: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[VIDEO-INGREDIENTS ${traceId}] ${message}`, data);
  } else {
    console.log(`[VIDEO-INGREDIENTS ${traceId}] ${message}`);
  }
}

async function getAssetBase64(asset: { content: string | null; storageKey: string | null; mimeType: string | null }) {
  if (asset.content) {
    if (asset.content.startsWith('http') || asset.content.startsWith('/api/')) {
      return null;
    }
    const base64Data = asset.content.includes(',') ? asset.content.split(',')[1] : asset.content;
    const sanitized = base64Data.replace(/\s/g, '');
    return { base64: sanitized, mimeType: asset.mimeType || 'image/png' };
  }

  if (asset.storageKey) {
    const result = await getAsset(asset.storageKey);
    if (result.success && result.data) {
      const sanitized = result.data.replace(/\s/g, '');
      return { base64: sanitized, mimeType: asset.mimeType || 'image/png' };
    }
  }

  return null;
}

async function normalizeReferenceImage(base64: string, mimeType?: string | null) {
  const buffer = Buffer.from(base64, 'base64');
  const detected = detectMimeFromBuffer(buffer);
  const finalMime = detected || mimeType || 'image/png';

  try {
    const meta = await sharp(buffer).metadata();
    let pipeline = sharp(buffer).rotate().toColorspace('srgb');
    const shouldResize = (meta.width && meta.width > MAX_REFERENCE_DIMENSION) || (meta.height && meta.height > MAX_REFERENCE_DIMENSION);
    if (shouldResize) {
      pipeline = pipeline.resize({
        width: MAX_REFERENCE_DIMENSION,
        height: MAX_REFERENCE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    const outputBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    const outputMime = 'image/png';

    return {
      base64: outputBuffer.toString('base64'),
      mimeType: outputMime,
      converted: !SUPPORTED_REFERENCE_MIME.has(finalMime) || outputMime !== finalMime,
      resized: !!shouldResize,
      sizeBytes: outputBuffer.length
    };
  } catch (error) {
    return { error: `Unable to process image (${finalMime})` };
  }
}

export interface ResolveIngredientsResult {
  referenceImages: VideoGenerationReferenceImage[];
  selectedAssetIds: string[];
  productIdUsed?: string;
  warnings: string[];
}

export async function resolveVideoIngredients(params: {
  boardId: string;
  productId?: string | null;
  ingredientAssetIds?: string[] | null;
  prompt?: string | null;
  traceId: string;
}): Promise<ResolveIngredientsResult> {
  const { boardId, productId, ingredientAssetIds, prompt, traceId } = params;
  const warnings: string[] = [];

  let candidateAssets: Array<{ id: string; content: string | null; storageKey: string | null; mimeType: string | null }> = [];
  let productIdUsed: string | undefined;

  if (ingredientAssetIds && ingredientAssetIds.length > 0) {
    logTrace(traceId, 'Resolving explicit ingredient asset IDs', ingredientAssetIds);
    candidateAssets = await db
      .select({ id: assets.id, content: assets.content, storageKey: assets.storageKey, mimeType: assets.mimeType })
      .from(assets)
      .where(and(eq(assets.boardId, boardId), inArray(assets.id, ingredientAssetIds)));
    const orderMap = new Map(ingredientAssetIds.map((id, index) => [id, index]));
    candidateAssets.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    if (candidateAssets.length < ingredientAssetIds.length) {
      warnings.push('One or more ingredient asset IDs were not found on this board');
    }
  } else {
    let targetProductId = productId || null;
    if (!targetProductId) {
      const boardProducts = await db.query.products.findMany({
        where: eq(products.boardId, boardId),
      });
      if (boardProducts.length === 1) {
        targetProductId = boardProducts[0].id;
      }
    }

    if (targetProductId) {
      const product = await db.query.products.findFirst({
        where: and(eq(products.id, targetProductId), eq(products.boardId, boardId)),
        with: { productAssets: true },
      });

      if (!product) {
        warnings.push('Product not found or not on board');
      } else {
        productIdUsed = product.id;
        const sortedAssignments = [...(product.productAssets || [])].sort((a, b) => {
          const scoreA = (a.isPrimary ? 1000 : 0) + (ROLE_PRIORITY[a.role] || 0);
          const scoreB = (b.isPrimary ? 1000 : 0) + (ROLE_PRIORITY[b.role] || 0);
          return scoreB - scoreA;
        });

        const productAssetIds = Array.from(new Set(sortedAssignments.map(a => a.assetId)));
        const selectedAssetIds: string[] = [];

        if (productAssetIds.length > 0) {
          selectedAssetIds.push(productAssetIds[0]);
        }

        const promptText = (prompt || '').toLowerCase();
        const blockAvatar = /no (people|person|faces|human|avatar|model)/.test(promptText) || /product\s*only/.test(promptText);

        const avatarAssets = await db
          .select({ id: assets.id, content: assets.content, storageKey: assets.storageKey, mimeType: assets.mimeType })
          .from(assets)
          .where(and(eq(assets.boardId, boardId), eq(assets.type, 'avatar')))
          .orderBy(desc(assets.createdAt))
          .limit(1);

        const logoAssets = await db
          .select({ id: assets.id, content: assets.content, storageKey: assets.storageKey, mimeType: assets.mimeType })
          .from(assets)
          .where(and(eq(assets.boardId, boardId), eq(assets.type, 'logo')))
          .orderBy(desc(assets.createdAt))
          .limit(1);

        if (!blockAvatar && avatarAssets.length > 0 && selectedAssetIds.length < 3) {
          selectedAssetIds.push(avatarAssets[0].id);
        }
        if (logoAssets.length > 0 && selectedAssetIds.length < 3) {
          selectedAssetIds.push(logoAssets[0].id);
        }

        for (const id of productAssetIds.slice(1)) {
          if (selectedAssetIds.length >= 3) break;
          if (!selectedAssetIds.includes(id)) selectedAssetIds.push(id);
        }

        if (selectedAssetIds.length === 0) {
          warnings.push('No product assets assigned');
        } else {
          candidateAssets = await db
            .select({ id: assets.id, content: assets.content, storageKey: assets.storageKey, mimeType: assets.mimeType })
            .from(assets)
            .where(and(eq(assets.boardId, boardId), inArray(assets.id, selectedAssetIds)));
        }
      }
    }
  }

  const referenceImages: VideoGenerationReferenceImage[] = [];
  const selectedAssetIds: string[] = [];

  for (const asset of candidateAssets.slice(0, 3)) {
    if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
      warnings.push(`Unsupported mime type for asset ${asset.id}`);
      continue;
    }
    const base64 = await getAssetBase64(asset);
    if (!base64) {
      warnings.push(`Missing bytes for asset ${asset.id}`);
      continue;
    }

    const normalized = await normalizeReferenceImage(base64.base64, base64.mimeType);
    if ('error' in normalized) {
      warnings.push(`${normalized.error} for asset ${asset.id}`);
      continue;
    }

    if (typeof normalized.sizeBytes === 'number') {
      const sizeKb = Math.round(normalized.sizeBytes / 1024);
      logTrace(traceId, `Prepared reference image ${asset.id}`, {
        mimeType: normalized.mimeType,
        sizeKb,
        resized: normalized.resized || false,
        converted: normalized.converted
      });
      if (normalized.sizeBytes > 8 * 1024 * 1024) {
        warnings.push(`Large reference image (${sizeKb} KB) for asset ${asset.id}`);
      }
    }

    referenceImages.push({
      image: {
        imageBytes: normalized.base64,
        mimeType: normalized.mimeType,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    });
    selectedAssetIds.push(asset.id);
  }

  if (referenceImages.length === 0) {
    logTrace(traceId, 'No valid reference images resolved', warnings);
  }

  return {
    referenceImages,
    selectedAssetIds,
    productIdUsed,
    warnings,
  };
}
