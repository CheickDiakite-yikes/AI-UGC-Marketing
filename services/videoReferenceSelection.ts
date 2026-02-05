import type { VideoGenerationReferenceImage } from '@google/genai';
import type { VideoReferenceRole } from '@/types';
import type { ReferenceAsset } from '@/services/videoIngredientService';

export type ReferenceLabel = {
  kind: 'asset' | 'continuity' | 'carryover' | 'auto';
  assetId?: string;
  role?: VideoReferenceRole;
  type?: ReferenceAsset['type'];
  origin?: ReferenceAsset['origin'];
  source?: ReferenceAsset['source'];
};

const isValidReferenceImage = (image?: VideoGenerationReferenceImage | null) => {
  return Boolean(image?.image?.imageBytes && image?.image?.mimeType);
};

const findRoleAsset = (assets: ReferenceAsset[], role: VideoReferenceRole) =>
  assets.find(asset => asset.role === role && isValidReferenceImage(asset.referenceImage));

const findAvatarAsset = (assets: ReferenceAsset[]) => {
  const byRole = findRoleAsset(assets, 'avatar');
  if (byRole) return byRole;
  return assets.find(asset => asset.type === 'avatar' && isValidReferenceImage(asset.referenceImage)) || null;
};

const pushImage = (
  target: VideoGenerationReferenceImage[],
  labels: ReferenceLabel[],
  image: VideoGenerationReferenceImage | null | undefined,
  seenImages: Set<string>,
  max: number,
  label: ReferenceLabel
) => {
  if (!image || target.length >= max) return false;
  const key = image?.image?.imageBytes || '';
  if (!key || seenImages.has(key)) return false;
  target.push(image);
  labels.push(label);
  seenImages.add(key);
  return true;
};

const pushAsset = (
  target: VideoGenerationReferenceImage[],
  labels: ReferenceLabel[],
  asset: ReferenceAsset | null | undefined,
  usedAssetIds: Set<string>,
  seenImages: Set<string>,
  max: number
) => {
  if (!asset || usedAssetIds.has(asset.id) || !isValidReferenceImage(asset.referenceImage)) return false;
  const added = pushImage(target, labels, asset.referenceImage, seenImages, max, {
    kind: 'asset',
    assetId: asset.id,
    role: asset.role,
    type: asset.type,
    origin: asset.origin,
    source: asset.source
  });
  if (added) usedAssetIds.add(asset.id);
  return added;
};

export type SceneReferenceSelection = {
  referenceImages: VideoGenerationReferenceImage[];
  safeReferenceImages: VideoGenerationReferenceImage[];
  usedAvatarReference: boolean;
  usedContinuityReference: boolean;
  usedCarryoverReference: boolean;
  referenceLabels: ReferenceLabel[];
  safeReferenceLabels: ReferenceLabel[];
};

export const buildSceneReferenceSelection = (params: {
  referenceAssets: ReferenceAsset[];
  continuityReference?: VideoGenerationReferenceImage | null;
  carryoverReference?: VideoGenerationReferenceImage | null;
  maxReferences?: number;
}): SceneReferenceSelection => {
  const referenceAssets = Array.isArray(params.referenceAssets) ? params.referenceAssets : [];
  const maxReferences = Math.max(1, params.maxReferences ?? 3);
  const usedAssetIds = new Set<string>();
  const seenImages = new Set<string>();

  let usedAvatarReference = false;
  let usedContinuityReference = false;
  let usedCarryoverReference = false;

  const safeReferenceImages: VideoGenerationReferenceImage[] = [];
  const safeReferenceLabels: ReferenceLabel[] = [];

  const avatarAsset = findAvatarAsset(referenceAssets);
  if (avatarAsset) {
    usedAvatarReference = pushAsset(safeReferenceImages, safeReferenceLabels, avatarAsset, usedAssetIds, seenImages, maxReferences);
  } else if (params.continuityReference) {
    usedContinuityReference = pushImage(
      safeReferenceImages,
      safeReferenceLabels,
      params.continuityReference,
      seenImages,
      maxReferences,
      { kind: 'continuity' }
    );
  }

  const itemAsset = findRoleAsset(referenceAssets, 'item');
  const settingAsset = findRoleAsset(referenceAssets, 'setting');
  pushAsset(safeReferenceImages, safeReferenceLabels, itemAsset, usedAssetIds, seenImages, maxReferences);
  pushAsset(safeReferenceImages, safeReferenceLabels, settingAsset, usedAssetIds, seenImages, maxReferences);

  if (params.carryoverReference && safeReferenceImages.length < maxReferences) {
    usedCarryoverReference = pushImage(
      safeReferenceImages,
      safeReferenceLabels,
      params.carryoverReference,
      seenImages,
      maxReferences,
      { kind: 'carryover' }
    );
  }

  if (safeReferenceImages.length === 0) {
    for (const asset of referenceAssets) {
      if (pushAsset(safeReferenceImages, safeReferenceLabels, asset, usedAssetIds, seenImages, maxReferences)) {
        break;
      }
    }
  }

  const referenceImages = [...safeReferenceImages];
  const referenceLabels = [...safeReferenceLabels];
  if (referenceImages.length < maxReferences) {
    for (const asset of referenceAssets) {
      if (referenceImages.length >= maxReferences) break;
      pushAsset(referenceImages, referenceLabels, asset, usedAssetIds, seenImages, maxReferences);
    }
  }

  return {
    referenceImages,
    safeReferenceImages,
    usedAvatarReference,
    usedContinuityReference,
    usedCarryoverReference,
    referenceLabels,
    safeReferenceLabels
  };
};
