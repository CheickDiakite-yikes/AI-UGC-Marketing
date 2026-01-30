import { db } from '@/db';
import { profileAssets, boards, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
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
    }
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
  options?: { includeLogo?: boolean; maxBrandImages?: number; includeAvatars?: boolean }
): Promise<BrandAssetData[]> {
  const { includeLogo = true, maxBrandImages = 2, includeAvatars = false } = options || {};

  const assets = await getBrandAssetsForBoard(boardId);
  if (assets.length === 0) return [];

  const result: BrandAssetData[] = [];

  const logo = assets.find(a => a.type === 'logo');
  if (includeLogo && logo) {
    try {
      const logoData = await getAssetAsBase64(logo.storageKey);
      if (logoData) {
        result.push({
          mimeType: logo.mimeType,
          base64: logoData,
          role: 'logo'
        });
      }
    } catch (e) {
      console.warn('[BRAND_ASSET_SERVICE] Failed to load logo:', e);
    }
  }

  const brandImages = assets.filter(a => a.type === 'image').slice(0, maxBrandImages);
  for (const img of brandImages) {
    try {
      const imgData = await getAssetAsBase64(img.storageKey);
      if (imgData) {
        result.push({
          mimeType: img.mimeType,
          base64: imgData,
          role: 'brand_image'
        });
      }
    } catch (e) {
      console.warn('[BRAND_ASSET_SERVICE] Failed to load brand image:', e);
    }
  }

  if (includeAvatars) {
    const avatars = assets.filter(a => a.type === 'avatar').slice(0, 1);
    for (const avatar of avatars) {
      try {
        const avatarData = await getAssetAsBase64(avatar.storageKey);
        if (avatarData) {
          result.push({
            mimeType: avatar.mimeType,
            base64: avatarData,
            role: 'avatar'
          });
        }
      } catch (e) {
        console.warn('[BRAND_ASSET_SERVICE] Failed to load avatar:', e);
      }
    }
  }

  return result;
}
