import { db } from '@/db';
import { profileAssets, boards, users } from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { getAssetAsBase64 } from './objectStorageService';

export interface BrandAssetReference {
  type: 'logo' | 'image' | 'avatar';
  storageKey: string;
  name: string;
  mimeType: string;
}

export interface BrandAssetData {
  mimeType: string;
  base64: string;
  role: 'logo' | 'brand_image' | 'avatar';
}

export interface AssetCatalogItem {
  id: string;
  type: 'logo' | 'image' | 'avatar' | 'pdf' | 'text' | 'link';
  name: string;
  description?: string;
}

export async function getAssetCatalogForUser(userId: string): Promise<AssetCatalogItem[]> {
  const assets = await db.query.profileAssets.findMany({
    where: eq(profileAssets.userId, userId),
    columns: {
      id: true,
      type: true,
      name: true,
      metadata: true
    }
  });

  return assets.map(a => ({
    id: a.id,
    type: a.type as AssetCatalogItem['type'],
    name: a.name,
    description: (a.metadata as any)?.description || undefined
  }));
}

export async function getAssetCatalogForBoard(boardId: string): Promise<AssetCatalogItem[]> {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { userId: true }
  });

  if (!board?.userId) return [];
  return getAssetCatalogForUser(board.userId);
}

export async function getBrandAssetsByIds(
  boardId: string,
  assetIds: string[]
): Promise<BrandAssetData[]> {
  if (!assetIds || assetIds.length === 0) return [];

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { userId: true }
  });

  if (!board?.userId) return [];

  const assets = await db.query.profileAssets.findMany({
    where: and(
      eq(profileAssets.userId, board.userId),
      inArray(profileAssets.id, assetIds)
    ),
    columns: {
      id: true,
      type: true,
      storageKey: true,
      mimeType: true,
      name: true
    }
  });

  const result: BrandAssetData[] = [];
  const assetById = new Map(assets.map(asset => [asset.id, asset]));
  const orderedAssets = assetIds
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .map(id => assetById.get(id))
    .filter((asset): asset is typeof assets[number] => Boolean(asset));
  
  for (const asset of orderedAssets) {
    if (!asset.storageKey || !asset.mimeType?.startsWith('image/')) continue;
    
    try {
      const base64 = await getAssetAsBase64(asset.storageKey);
      if (base64) {
        let role: BrandAssetData['role'] = 'brand_image';
        if (asset.type === 'logo') role = 'logo';
        else if (asset.type === 'avatar') role = 'avatar';
        
        result.push({
          mimeType: asset.mimeType,
          base64,
          role
        });
      }
    } catch (e) {
      console.warn(`[BRAND_ASSET_SERVICE] Failed to load asset ${asset.id}:`, e);
    }
  }

  return result;
}

export async function getBrandAssetsForBoard(boardId: string): Promise<BrandAssetReference[]> {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { userId: true }
  });

  if (!board?.userId) {
    return [];
  }

  const assets = await db.query.profileAssets.findMany({
    where: and(
      eq(profileAssets.userId, board.userId),
      inArray(profileAssets.type, ['logo', 'image', 'avatar'])
    ),
    columns: {
      type: true,
      storageKey: true,
      name: true,
      mimeType: true
    },
    orderBy: [desc(profileAssets.createdAt)]
  });

  return assets
    .filter(a => a.storageKey && a.mimeType?.startsWith('image/'))
    .map(a => ({
      type: a.type as 'logo' | 'image' | 'avatar',
      storageKey: a.storageKey!,
      name: a.name,
      mimeType: a.mimeType!
    }));
}

export async function getBrandAssetDataForGeneration(
  boardId: string,
  options?: { includeLogo?: boolean; maxBrandImages?: number; includeAvatars?: boolean; maxTotal?: number; maxLogos?: number; maxAvatars?: number }
): Promise<BrandAssetData[]> {
  const {
    includeLogo = true,
    maxBrandImages,
    includeAvatars = false,
    maxTotal = 14,
    maxLogos = 1,
    maxAvatars = 1
  } = options || {};

  const assets = await getBrandAssetsForBoard(boardId);
  if (assets.length === 0 || maxTotal <= 0) return [];

  const result: BrandAssetData[] = [];
  let remaining = maxTotal;

  const pushAsset = async (asset: BrandAssetReference, role: BrandAssetData['role']) => {
    if (remaining <= 0) return;
    try {
      const assetData = await getAssetAsBase64(asset.storageKey);
      if (assetData) {
        result.push({
          mimeType: asset.mimeType,
          base64: assetData,
          role
        });
        remaining -= 1;
      }
    } catch (e) {
      console.warn(`[BRAND_ASSET_SERVICE] Failed to load ${role}:`, e);
    }
  };

  if (includeLogo && remaining > 0) {
    const logos = assets.filter(a => a.type === 'logo').slice(0, Math.max(0, maxLogos));
    for (const logo of logos) {
      await pushAsset(logo, 'logo');
      if (remaining <= 0) break;
    }
  }

  if (includeAvatars && remaining > 0) {
    const avatars = assets.filter(a => a.type === 'avatar').slice(0, Math.max(0, maxAvatars));
    for (const avatar of avatars) {
      await pushAsset(avatar, 'avatar');
      if (remaining <= 0) break;
    }
  }

  if (remaining > 0) {
    const brandImages = assets.filter(a => a.type === 'image');
    const maxImages = typeof maxBrandImages === 'number'
      ? Math.min(maxBrandImages, remaining)
      : remaining;
    for (const img of brandImages.slice(0, Math.max(0, maxImages))) {
      await pushAsset(img, 'brand_image');
      if (remaining <= 0) break;
    }
  }

  return result;
}
