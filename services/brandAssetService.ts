import { db } from '@/db';
import { profileAssets, boards, users } from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { getAssetAsBase64 } from './objectStorageService';

export interface BrandAssetReference {
  type: 'logo' | 'image' | 'avatar';
  storageKey: string;
  name: string;
  mimeType: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date | null;
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
    description: (() => {
      const meta = (a.metadata as any) || {};
      const bits = [];
      if (meta.description) bits.push(String(meta.description));
      if (meta.category) bits.push(`category:${String(meta.category)}`);
      if (meta.imageType) bits.push(`type:${String(meta.imageType)}`);
      return bits.length > 0 ? bits.join(' | ') : undefined;
    })()
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
      mimeType: true,
      metadata: true,
      createdAt: true
    },
    orderBy: [desc(profileAssets.createdAt)]
  });

  return assets
    .filter(a => a.storageKey && a.mimeType?.startsWith('image/'))
    .map(a => ({
      type: a.type as 'logo' | 'image' | 'avatar',
      storageKey: a.storageKey!,
      name: a.name,
      mimeType: a.mimeType!,
      metadata: a.metadata as Record<string, unknown> | null,
      createdAt: a.createdAt || null
    }));
}

export async function getBrandAssetDataForGeneration(
  boardId: string,
  options?: { includeLogo?: boolean; maxBrandImages?: number; includeAvatars?: boolean; maxTotal?: number; maxLogos?: number; maxAvatars?: number; prompt?: string }
): Promise<BrandAssetData[]> {
  const {
    includeLogo = true,
    maxBrandImages,
    includeAvatars = false,
    maxTotal = 14,
    maxLogos = 1,
    maxAvatars = 1,
    prompt
  } = options || {};

  const assets = await getBrandAssetsForBoard(boardId);
  if (assets.length === 0 || maxTotal <= 0) return [];

  const result: BrandAssetData[] = [];
  let remaining = maxTotal;
  const promptText = (prompt || '').toLowerCase();
  const blockLogo = /(no logo|without logo|logo[-\s]?free|no branding|without branding|no brand mark|no watermark)/.test(promptText);
  const wantsLogo = !blockLogo && /(\blogo\b|logomark|wordmark|brand mark|brandmark|watermark|logo bug|logo reveal|logo animation|brand logo)/.test(promptText);
  const wantsUI = /(ui|screen|screenshot|dashboard|app|saas|software|website|landing page|product tour|walkthrough|demo|tutorial|interface)/.test(promptText);
  const wantsPackaging = /(packaging|unbox|unboxing|box|label|bottle|jar|container|tube|bag)/.test(promptText);
  const wantsLifestyle = /(lifestyle|in use|usage|hands|holding|wearing|apply|pour|spray|gym|kitchen|outdoor|everyday)/.test(promptText);
  const wantsProduct = /(product shot|packshot|hero|flatlay|macro|product close[-\s]?up)/.test(promptText);
  const wantsSetting = /(background|setting|environment|scene|interior|exterior|studio|office|kitchen|outdoor|city|nature)/.test(promptText);

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

  if (includeLogo && !blockLogo && remaining > 0) {
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

    const scored = brandImages.map(asset => {
      const meta = (asset.metadata || {}) as Record<string, unknown>;
      const imageType = typeof meta.imageType === 'string' ? meta.imageType.toLowerCase() : '';
      const metaCategory = typeof meta.category === 'string' ? meta.category.toLowerCase() : '';
      const name = asset.name.toLowerCase();
      const text = `${name} ${imageType} ${metaCategory}`;

      const hasUI = /(ui|screen|screenshot|dashboard|app|saas|software|website|landing|interface)/.test(text);
      const hasPackaging = /(packaging|box|label|bottle|jar|container|tube|bag|unbox)/.test(text);
      const hasLifestyle = /(lifestyle|in[-\s]?use|usage|holding|wearing|outdoor|gym|kitchen|model)/.test(text);
      const hasProduct = /(product|hero|packshot|flatlay|macro)/.test(text);
      const hasSetting = /(background|setting|scene|environment|interior|exterior|studio|office|city|nature)/.test(text);

      let score = 0;
      if (wantsUI && hasUI) score += 5;
      if (wantsPackaging && hasPackaging) score += 5;
      if (wantsLifestyle && hasLifestyle) score += 4;
      if (wantsProduct && hasProduct) score += 4;
      if (wantsSetting && hasSetting) score += 3;
      if (wantsLogo && hasProduct && !hasUI && !hasPackaging) score += 1;

      const createdAt = asset.createdAt ? new Date(asset.createdAt).getTime() : 0;
      return { asset, score, createdAt, hasUI, hasPackaging, hasLifestyle, hasProduct, hasSetting };
    });

    const selectedKeys: string[] = [];
    const seen = new Set<string>();
    const selectBy = (predicate: (candidate: typeof scored[number]) => boolean) => {
      if (selectedKeys.length >= maxImages) return;
      const candidate = scored.find(item => predicate(item) && !seen.has(item.asset.storageKey));
      if (candidate) {
        seen.add(candidate.asset.storageKey);
        selectedKeys.push(candidate.asset.storageKey);
      }
    };

    if (wantsUI) selectBy(item => item.hasUI);
    if (wantsPackaging) selectBy(item => item.hasPackaging);
    if (wantsLifestyle) selectBy(item => item.hasLifestyle);
    if (wantsProduct) selectBy(item => item.hasProduct);
    if (wantsSetting) selectBy(item => item.hasSetting);

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.createdAt - a.createdAt;
    });

    for (const item of scored) {
      if (selectedKeys.length >= maxImages) break;
      if (seen.has(item.asset.storageKey)) continue;
      seen.add(item.asset.storageKey);
      selectedKeys.push(item.asset.storageKey);
    }

    const assetByKey = new Map(brandImages.map(asset => [asset.storageKey, asset]));
    const selectedAssets = selectedKeys
      .map(key => assetByKey.get(key))
      .filter((asset): asset is BrandAssetReference => Boolean(asset))
      .slice(0, maxImages);
    for (const img of selectedAssets) {
      await pushAsset(img, 'brand_image');
      if (remaining <= 0) break;
    }
  }

  return result;
}
