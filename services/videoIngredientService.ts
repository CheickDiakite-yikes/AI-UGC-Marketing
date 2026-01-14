import { db } from '@/db';
import { assets, products } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { getAsset } from './objectStorageService';
import { VideoGenerationReferenceType } from '@google/genai';
import type { VideoGenerationReferenceImage } from '@google/genai';

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

function logTrace(traceId: string, message: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[VIDEO-INGREDIENTS ${traceId}] ${message}`, data);
  } else {
    console.log(`[VIDEO-INGREDIENTS ${traceId}] ${message}`);
  }
}

async function getAssetBase64(asset: { content: string | null; storageKey: string | null; mimeType: string | null }) {
  if (asset.content) {
    return { base64: asset.content, mimeType: asset.mimeType || 'image/png' };
  }

  if (asset.storageKey) {
    const result = await getAsset(asset.storageKey);
    if (result.success && result.data) {
      return { base64: result.data, mimeType: asset.mimeType || 'image/png' };
    }
  }

  return null;
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
  traceId: string;
}): Promise<ResolveIngredientsResult> {
  const { boardId, productId, ingredientAssetIds, traceId } = params;
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

        const selectedAssetIds = Array.from(new Set(sortedAssignments.map(a => a.assetId))).slice(0, 3);

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

    referenceImages.push({
      image: {
        imageBytes: base64.base64,
        mimeType: base64.mimeType,
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
