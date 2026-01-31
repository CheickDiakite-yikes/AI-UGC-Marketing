import { db } from '@/db';
import { assets, boards, products, profileAssets } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getAsset } from './objectStorageService';
import { VideoGenerationReferenceType } from '@google/genai';
import type { VideoGenerationReferenceImage } from '@google/genai';
import type { AvatarIdentity, ProjectAsset, VideoReferenceMode, VideoReferenceRole, VideoReferenceSelection } from '@/types';
import sharp from 'sharp';
import { shouldUseAvatar } from './identityPromptUtils';

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

const sanitizeBase64 = (data: string): string => {
  const trimmed = data.trim();
  if (!trimmed) return '';
  return trimmed.includes(',') ? trimmed.split(',')[1] : trimmed;
};

async function buildAvatarIdentityReferences(params: {
  avatarIdentity: AvatarIdentity;
  traceId: string;
  maxReferenceImages: number;
  warnings: string[];
}): Promise<ReferenceAsset[]> {
  const { avatarIdentity, traceId, maxReferenceImages, warnings } = params;
  const references: ReferenceAsset[] = [];
  const base64Images = Array.isArray(avatarIdentity.referenceImages)
    ? avatarIdentity.referenceImages
    : [];

  for (let i = 0; i < base64Images.length && references.length < maxReferenceImages; i += 1) {
    const sanitized = sanitizeBase64(base64Images[i]);
    if (!sanitized) {
      warnings.push(`Empty avatar identity reference image ${i + 1}`);
      continue;
    }

    const normalized = await normalizeReferenceImage(sanitized, 'image/png');
    if ('error' in normalized) {
      warnings.push(`${normalized.error} for avatar identity reference ${i + 1}`);
      continue;
    }

    if (typeof normalized.sizeBytes === 'number') {
      const sizeKb = Math.round(normalized.sizeBytes / 1024);
      logTrace(traceId, `Prepared avatar identity reference ${i + 1}`, {
        mimeType: normalized.mimeType,
        sizeKb,
        resized: normalized.resized || false,
        converted: normalized.converted
      });
    }

    const referenceImage: VideoGenerationReferenceImage = {
      image: {
        imageBytes: normalized.base64,
        mimeType: normalized.mimeType,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    };
    references.push({
      id: `avatar-identity-${i + 1}`,
      type: 'avatar',
      referenceImage,
      source: 'avatar_identity',
      role: 'avatar'
    });
  }

  if (references.length > 0) {
    logTrace(traceId, 'Prepared avatar identity references', {
      count: references.length
    });
  }

  return references;
}

export interface ReferenceAsset {
  id: string;
  type: ProjectAsset['type'];
  referenceImage: VideoGenerationReferenceImage;
  source?: 'asset' | 'avatar_identity';
  role?: VideoReferenceRole;
  origin?: 'board' | 'profile';
}

export interface InitialFrameImage {
  imageBytes: string;
  mimeType: string;
}

export interface ResolveIngredientsResult {
  referenceImages: VideoGenerationReferenceImage[];
  referenceAssets: ReferenceAsset[];
  selectedAssetIds: string[];
  productIdUsed?: string;
  initialFrame?: InitialFrameImage | null;
  initialFrameAssetId?: string;
  initialFrameRole?: VideoReferenceRole;
  initialFrameOrigin?: 'board' | 'profile';
  initialFrameSource?: 'asset' | 'avatar_identity';
  warnings: string[];
}

export async function resolveVideoIngredients(params: {
  boardId: string;
  productId?: string | null;
  ingredientAssetIds?: string[] | null;
  referenceSelections?: VideoReferenceSelection[] | null;
  referenceMode?: VideoReferenceMode | null;
  prompt?: string | null;
  traceId: string;
  preferAvatar?: boolean;
  maxReferenceImages?: number;
}): Promise<ResolveIngredientsResult> {
  const { boardId, productId, ingredientAssetIds, prompt, traceId } = params;
  const warnings: string[] = [];
  const maxReferenceImages = Math.max(1, params.maxReferenceImages ?? 3);
  const preferAvatar = params.preferAvatar === true;
  const promptText = (prompt || '').toLowerCase();
  const blockAvatar = /no (people|person|faces|human|avatar|model)/.test(promptText) || /product\s*only/.test(promptText);
  const wantsLogo = /(\blogo\b|logomark|wordmark|brand mark|brandmark|watermark|logo bug|logo reveal|logo animation)/.test(promptText);
  const allowAvatarInjection = preferAvatar && !blockAvatar && shouldUseAvatar(prompt || '');
  const referenceSelections = Array.isArray(params.referenceSelections) ? params.referenceSelections : [];
  const hasExplicitSelections = referenceSelections.length > 0 || (ingredientAssetIds && ingredientAssetIds.length > 0);
  const referenceMode = (params.referenceMode === 'manual' || params.referenceMode === 'hybrid' || params.referenceMode === 'auto')
    ? params.referenceMode
    : (hasExplicitSelections ? 'manual' : 'auto');
  const allowAutoFill = referenceMode !== 'manual';
  const allowAvatarAuto = allowAvatarInjection && allowAutoFill;
  const roleByAssetId = new Map<string, VideoReferenceRole>();
  const boardRecord = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    columns: { userId: true },
    with: { avatarIdentity: true }
  });
  const boardUserId = boardRecord?.userId ?? null;
  const explicitSelectionIds: string[] = [];

  if (referenceSelections.length > 0 && referenceMode === 'auto') {
    logTrace(traceId, 'Reference mode auto; ignoring manual reference selections');
  } else if (referenceSelections.length > 0) {
    for (const selection of referenceSelections) {
      if (!selection || typeof selection.assetId !== 'string') continue;
      if (!explicitSelectionIds.includes(selection.assetId)) {
        explicitSelectionIds.push(selection.assetId);
      }
      if (selection.role) {
        roleByAssetId.set(selection.assetId, selection.role);
      }
    }
    logTrace(traceId, 'Using reference selections', {
      referenceMode,
      selections: explicitSelectionIds.map(id => ({ assetId: id, role: roleByAssetId.get(id) || null }))
    });
  } else {
    logTrace(traceId, 'Reference mode set', { referenceMode });
  }

  type CandidateAsset = {
    id: string;
    content: string | null;
    storageKey: string | null;
    mimeType: string | null;
    type: ProjectAsset['type'];
    origin: 'board' | 'profile';
  };
  let candidateAssets: CandidateAsset[] = [];
  let productIdUsed: string | undefined;
  let requestedAssetIds: string[] = [];
  let avatarAssetId: string | null = null;
  let avatarIdentity: AvatarIdentity | null = null;
  let autoCandidateIds: string[] = [];

  const buildAutoCandidates = async (): Promise<{ ids: string[]; avatarAssetId: string | null }> => {
    let resolvedAvatarId: string | null = null;
    if (allowAvatarAuto) {
      const avatarAssets = await db
        .select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.boardId, boardId), eq(assets.type, 'avatar')))
        .orderBy(desc(assets.createdAt))
        .limit(1);
      if (avatarAssets.length > 0) {
        resolvedAvatarId = avatarAssets[0].id;
      } else {
        logTrace(traceId, 'No avatar asset found for auto selection');
      }
    }

    const selectedAssetIds: string[] = [];
    const seen = new Set<string>();
    let logoAssetId: string | null = null;
    const ensureLogoAsset = async () => {
      if (logoAssetId !== null) return;
      const logoAssets = await db
        .select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.boardId, boardId), eq(assets.type, 'logo')))
        .orderBy(desc(assets.createdAt))
        .limit(1);
      logoAssetId = logoAssets.length > 0 ? logoAssets[0].id : null;
    };
    const pushId = (id?: string | null) => {
      if (!id) return;
      if (seen.has(id)) return;
      if (selectedAssetIds.length >= maxReferenceImages) return;
      selectedAssetIds.push(id);
      seen.add(id);
    };
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
        if (productAssetIds.length > 0) {
          pushId(productAssetIds[0]);
        }

        if (resolvedAvatarId) {
          pushId(resolvedAvatarId);
        }

        await ensureLogoAsset();
        if (logoAssetId) {
          pushId(logoAssetId);
        }

        for (const id of productAssetIds.slice(1)) {
          pushId(id);
        }

        if (selectedAssetIds.length < maxReferenceImages) {
          const remainingSlots = maxReferenceImages - selectedAssetIds.length;
          const brandImages = await db
            .select({ id: assets.id })
            .from(assets)
            .where(and(eq(assets.boardId, boardId), eq(assets.type, 'image')))
            .orderBy(desc(assets.createdAt))
            .limit(Math.max(0, remainingSlots));
          for (const image of brandImages) {
            pushId(image.id);
          }
        }

        if (selectedAssetIds.length === 0) {
          warnings.push('No product assets assigned');
        }
      }
    } else {
      if (resolvedAvatarId) {
        pushId(resolvedAvatarId);
      }

      if (wantsLogo) {
        await ensureLogoAsset();
        if (logoAssetId) {
          pushId(logoAssetId);
        }
      }

      if (selectedAssetIds.length < maxReferenceImages) {
        const remainingSlots = maxReferenceImages - selectedAssetIds.length;
        const brandImages = await db
          .select({ id: assets.id })
          .from(assets)
          .where(and(eq(assets.boardId, boardId), eq(assets.type, 'image')))
          .orderBy(desc(assets.createdAt))
          .limit(Math.max(0, remainingSlots));
        for (const image of brandImages) {
          pushId(image.id);
        }
      }

      if (selectedAssetIds.length < maxReferenceImages) {
        await ensureLogoAsset();
        if (logoAssetId) {
          pushId(logoAssetId);
        }
      }
    }

    if (selectedAssetIds.length < maxReferenceImages && boardUserId) {
      const profileRows = await db
        .select({ id: profileAssets.id, type: profileAssets.type })
        .from(profileAssets)
        .where(and(eq(profileAssets.userId, boardUserId), inArray(profileAssets.type, ['avatar', 'image', 'logo'])))
        .orderBy(desc(profileAssets.createdAt));

      const profileAvatars = profileRows.filter(row => row.type === 'avatar');
      const profileImages = profileRows.filter(row => row.type === 'image');
      const profileLogos = profileRows.filter(row => row.type === 'logo');

      if (allowAvatarAuto && profileAvatars.length > 0) {
        pushId(profileAvatars[0].id);
      }

      if (wantsLogo && profileLogos.length > 0) {
        pushId(profileLogos[0].id);
      }

      for (const image of profileImages) {
        pushId(image.id);
        if (selectedAssetIds.length >= maxReferenceImages) break;
      }

      if (selectedAssetIds.length < maxReferenceImages && profileLogos.length > 0) {
        pushId(profileLogos[0].id);
      }
    }

    return { ids: selectedAssetIds, avatarAssetId: resolvedAvatarId };
  };

  if (explicitSelectionIds.length > 0 && referenceMode !== 'auto') {
    requestedAssetIds = [...explicitSelectionIds];
  } else if (ingredientAssetIds && ingredientAssetIds.length > 0 && referenceMode !== 'auto') {
    logTrace(traceId, 'Resolving explicit ingredient asset IDs', ingredientAssetIds);
    requestedAssetIds = [...ingredientAssetIds];
  } else if (ingredientAssetIds && ingredientAssetIds.length > 0 && referenceMode === 'auto') {
    logTrace(traceId, 'Reference mode auto; ignoring ingredientAssetIds');
  }

  if (allowAutoFill) {
    const autoResult = await buildAutoCandidates();
    autoCandidateIds = autoResult.ids;
    avatarAssetId = autoResult.avatarAssetId;
  }

  if (referenceSelections.length > 0 && ingredientAssetIds && ingredientAssetIds.length > 0 && referenceMode !== 'auto') {
    logTrace(traceId, 'Ignoring ingredientAssetIds because reference selections were provided');
  }

  if (requestedAssetIds.length === 0 && allowAutoFill) {
    requestedAssetIds = [...autoCandidateIds];
  }

  if (allowAutoFill && requestedAssetIds.length > 0 && requestedAssetIds.length < maxReferenceImages) {
    const merged: string[] = [];
    const seen = new Set<string>();
    if (avatarAssetId && !requestedAssetIds.includes(avatarAssetId)) {
      merged.push(avatarAssetId);
      seen.add(avatarAssetId);
    }
    for (const id of requestedAssetIds) {
      if (seen.has(id)) continue;
      merged.push(id);
      seen.add(id);
      if (merged.length >= maxReferenceImages) break;
    }
    for (const id of autoCandidateIds) {
      if (merged.length >= maxReferenceImages) break;
      if (seen.has(id)) continue;
      merged.push(id);
      seen.add(id);
    }
    if (merged.length > 0 && merged.join(',') !== requestedAssetIds.join(',')) {
      logTrace(traceId, 'Auto-filled reference selections', {
        before: requestedAssetIds,
        after: merged,
        referenceMode
      });
    }
    requestedAssetIds = merged;
  }

  if (allowAvatarAuto && !avatarAssetId) {
    avatarIdentity = boardRecord?.avatarIdentity as AvatarIdentity | null;
    if (!avatarIdentity || !Array.isArray(avatarIdentity.referenceImages) || avatarIdentity.referenceImages.length === 0) {
      logTrace(traceId, 'No avatar identity references available');
    }
  }

  if (requestedAssetIds.length > 0) {
    const seen = new Set<string>();
    requestedAssetIds = requestedAssetIds.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (requestedAssetIds.length > maxReferenceImages) {
      const trimmed = requestedAssetIds.slice(0, maxReferenceImages);
      logTrace(traceId, 'Trimming ingredient references to max count', {
        before: requestedAssetIds,
        after: trimmed,
        maxReferenceImages
      });
      requestedAssetIds = trimmed;
    }

    const boardAssets = await db
      .select({
        id: assets.id,
        content: assets.content,
        storageKey: assets.storageKey,
        mimeType: assets.mimeType,
        type: assets.type,
      })
      .from(assets)
      .where(and(eq(assets.boardId, boardId), inArray(assets.id, requestedAssetIds)));

    candidateAssets = boardAssets.map(asset => ({ ...asset, origin: 'board' }));
    const resolvedIds = new Set(candidateAssets.map(asset => asset.id));
    const missingIds = requestedAssetIds.filter(id => !resolvedIds.has(id));

    if (missingIds.length > 0 && boardUserId) {
      const profileMatches = await db
        .select({
          id: profileAssets.id,
          content: profileAssets.content,
          storageKey: profileAssets.storageKey,
          mimeType: profileAssets.mimeType,
          type: profileAssets.type,
        })
        .from(profileAssets)
        .where(and(eq(profileAssets.userId, boardUserId), inArray(profileAssets.id, missingIds)));

      candidateAssets = [
        ...candidateAssets,
        ...profileMatches.map(asset => ({ ...asset, origin: 'profile' as const }))
      ];
    }

    const orderMap = new Map(requestedAssetIds.map((id, index) => [id, index]));
    candidateAssets.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    if (candidateAssets.length < requestedAssetIds.length) {
      warnings.push('One or more ingredient asset IDs were not found on this board or profile library');
    }

    logTrace(traceId, 'Resolved ingredient assets', candidateAssets.map(asset => ({
      id: asset.id,
      type: asset.type,
      origin: asset.origin,
      role: roleByAssetId.get(asset.id) || null
    })));
  }

  const assetReferenceAssets: ReferenceAsset[] = [];

  for (const asset of candidateAssets.slice(0, maxReferenceImages)) {
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

    const referenceImage: VideoGenerationReferenceImage = {
      image: {
        imageBytes: normalized.base64,
        mimeType: normalized.mimeType,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    };
    assetReferenceAssets.push({
      id: asset.id,
      type: asset.type,
      referenceImage,
      source: 'asset',
      role: roleByAssetId.get(asset.id),
      origin: asset.origin
    });
  }

  let referenceAssets: ReferenceAsset[] = assetReferenceAssets;
  if (allowAvatarAuto && !assetReferenceAssets.some(asset => asset.type === 'avatar') && avatarIdentity?.referenceImages?.length) {
    const avatarReferenceLimit = assetReferenceAssets.length > 0 ? 1 : maxReferenceImages;
    const avatarIdentityReferences = await buildAvatarIdentityReferences({
      avatarIdentity,
      traceId,
      maxReferenceImages: avatarReferenceLimit,
      warnings
    });
    if (avatarIdentityReferences.length > 0) {
      referenceAssets = [...avatarIdentityReferences, ...assetReferenceAssets];
      if (referenceAssets.length > maxReferenceImages) {
        const trimmed = referenceAssets.slice(0, maxReferenceImages);
        logTrace(traceId, 'Trimming references after avatar identity merge', {
          before: referenceAssets.map(asset => asset.id),
          after: trimmed.map(asset => asset.id),
          maxReferenceImages
        });
        referenceAssets = trimmed;
      }
    }
  }

  const referenceImages = referenceAssets.map(asset => asset.referenceImage);
  const selectedAssetIds = referenceAssets
    .filter(asset => asset.source !== 'avatar_identity')
    .map(asset => asset.id);

  if (referenceImages.length === 0) {
    logTrace(traceId, 'No valid reference images resolved', warnings);
  }
  if (wantsLogo && !referenceAssets.some(asset => asset.type === 'logo')) {
    warnings.push('Prompt requested a logo, but no logo reference asset was available');
  }

  const hasExplicitAvatarSelection = referenceAssets.some(asset => asset.role === 'avatar');
  const allowAvatarFrame = !blockAvatar && (shouldUseAvatar(prompt || '') || hasExplicitAvatarSelection);
  const usableAssets = referenceAssets.filter(asset => asset.type !== 'logo' && asset.referenceImage?.image?.imageBytes);
  const logoAsset = referenceAssets.find(asset => asset.type === 'logo' && asset.referenceImage?.image?.imageBytes);
  const byRole = (role: VideoReferenceRole) =>
    usableAssets.find(asset => asset.role === role && asset.source !== 'avatar_identity' && (allowAvatarFrame || asset.type !== 'avatar'));

  let initialFrameAsset: ReferenceAsset | null = byRole('item') || byRole('setting') || null;
  if (!initialFrameAsset) {
    const nonAvatarAssets = usableAssets.filter(asset => asset.type !== 'avatar' && asset.source !== 'avatar_identity');
    initialFrameAsset = nonAvatarAssets[0] || usableAssets.find(asset => asset.source !== 'avatar_identity') || null;
  }
  if (!initialFrameAsset && allowAvatarFrame) {
    initialFrameAsset = usableAssets.find(asset => asset.type === 'avatar') || null;
  }
  if (!initialFrameAsset && wantsLogo && logoAsset) {
    initialFrameAsset = logoAsset;
  }
  const initialFrame = initialFrameAsset?.referenceImage?.image || null;

  if (initialFrameAsset) {
    logTrace(traceId, 'Selected initial frame', {
      assetId: initialFrameAsset.id,
      type: initialFrameAsset.type,
      role: initialFrameAsset.role || null,
      origin: initialFrameAsset.origin || null,
      source: initialFrameAsset.source || null
    });
  }

  return {
    referenceImages,
    referenceAssets,
    selectedAssetIds,
    productIdUsed,
    initialFrame,
    initialFrameAssetId: initialFrameAsset?.id,
    initialFrameRole: initialFrameAsset?.role,
    initialFrameOrigin: initialFrameAsset?.origin,
    initialFrameSource: initialFrameAsset?.source,
    warnings,
  };
}
