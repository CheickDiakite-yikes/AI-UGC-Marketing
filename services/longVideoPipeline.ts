import { VideoGenerationReferenceImage, VideoGenerationReferenceType } from '@google/genai';
import { db } from '@/db';
import { generatedItems } from '@/db/schema';
import { VeoConfig, VideoReferenceMode, VideoReferenceSelection } from '@/types';
import { uploadGeneratedItem } from '@/services/objectStorageService';
import { compileVisualPromptWithIdentity } from '@/services/identityPromptService';
import { applyLongVideoContinuityGuardrails, applyVideoDurationGuardrails } from '@/services/videoPromptUtils';
import { resolveVideoIngredients } from '@/services/videoIngredientService';
import type { ReferenceAsset } from '@/services/videoIngredientService';
import { generateAutoReferenceImages } from '@/services/videoReferenceService';
import { generateVeoVideo } from '@/services/geminiService';
import { extractLastFrame, stitchVideoClips } from '@/services/videoStitchService';

const MAX_LONG_VIDEO_SECONDS = 30;
const SUPPORTED_DURATIONS = new Set([4, 6, 8]);
const CONTINUITY_ANCHOR_BLOCK = [
  "[CONTINUITY ANCHOR]",
  "- Single person on a neutral background in even, natural lighting.",
  "- Clear, sharp face; waist-up framing; relaxed, neutral pose.",
  "- No props, no product, no text, no logos, no extra people.",
  "- Keep hair, facial features, skin tone, body type, and outfit exactly as specified.",
  "- This reference locks the main character identity for all scenes."
].join("\n");

export type LongVideoScene = {
  prompt: string;
  title?: string;
  durationSeconds?: number;
  camera?: string;
  action?: string;
  transition?: string;
};

export type LongVideoPayload = {
  title?: string;
  hook?: string;
  caption?: string;
  aspectRatio?: string;
  resolution?: string;
  qualityMode?: boolean;
  productId?: string;
  ingredientAssetIds?: string[];
  referenceSelections?: VideoReferenceSelection[];
  referenceMode?: VideoReferenceMode;
  continuitySpec?: string;
  prompt?: string;
  scenes: LongVideoScene[];
  traceId?: string;
};

export type LongVideoResult = {
  finalItemId: string;
  sceneItemIds: string[];
  sceneCount: number;
  totalDurationSeconds: number;
};

const normalizeDurationSeconds = (value?: number) => {
  if (value && SUPPORTED_DURATIONS.has(value)) {
    return value as 4 | 6 | 8;
  }
  return 8 as 8;
};

const buildScenePrompt = (scene: LongVideoScene, params: {
  continuitySpec?: string;
  summaryPrompt?: string;
  sceneIndex: number;
  sceneCount: number;
}) => {
  const blocks = [];
  if (params.summaryPrompt) {
    blocks.push(`[LONG VIDEO BRIEF]\n${params.summaryPrompt.trim()}`);
  }
  if (params.continuitySpec) {
    blocks.push(`[CONTINUITY SPEC]\n${params.continuitySpec.trim()}`);
  }
  blocks.push(`[SCENE ${params.sceneIndex} OF ${params.sceneCount}]\n${scene.prompt.trim()}`);
  if (scene.camera) {
    blocks.push(`Camera: ${scene.camera}`);
  }
  if (scene.action) {
    blocks.push(`Action: ${scene.action}`);
  }
  if (scene.transition) {
    blocks.push(`Transition: ${scene.transition}`);
  }
  return blocks.join('\n\n');
};

const buildContinuityAnchorPrompt = (params: {
  continuitySpec?: string;
  summaryPrompt?: string;
  aspectRatio: string;
}) => {
  const blocks: string[] = [];
  if (params.summaryPrompt) {
    blocks.push(`[LONG VIDEO BRIEF]\n${params.summaryPrompt.trim()}`);
  }
  if (params.continuitySpec) {
    blocks.push(`[CONTINUITY SPEC]\n${params.continuitySpec.trim()}`);
  }
  blocks.push(`Aspect ratio: ${params.aspectRatio}`);
  blocks.push(CONTINUITY_ANCHOR_BLOCK);
  return blocks.join('\n\n');
};

const toReferenceImage = (frame: { base64: string; mimeType: string }): VideoGenerationReferenceImage => ({
  image: {
    imageBytes: frame.base64,
    mimeType: frame.mimeType,
  },
  referenceType: VideoGenerationReferenceType.ASSET,
});

const clampReferenceImages = (images: VideoGenerationReferenceImage[]) => images.slice(0, 3);

const selectBestIngredientAsset = (assets: ReferenceAsset[]): ReferenceAsset | null => {
  const nonAvatar = assets.filter(asset => asset.type !== 'avatar');
  if (nonAvatar.length === 0) return null;
  const nonLogo = nonAvatar.filter(asset => asset.type !== 'logo');
  return nonLogo[0] || nonAvatar[0] || null;
};

export async function generateLongVideoAssets(params: {
  boardId: string;
  payload: LongVideoPayload;
}): Promise<LongVideoResult> {
  const { boardId, payload } = params;
  const traceId = payload.traceId || crypto.randomUUID();
  const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];

  if (scenes.length < 2) {
    throw new Error('Long videos require at least 2 scenes');
  }
  if (scenes.length > 5) {
    throw new Error('Long videos support up to 5 scenes');
  }

  const normalizedScenes = scenes.map(scene => ({
    ...scene,
    durationSeconds: normalizeDurationSeconds(scene.durationSeconds),
  }));

  const totalDurationSeconds = normalizedScenes.reduce((acc, scene) => acc + (scene.durationSeconds || 0), 0);
  if (totalDurationSeconds > MAX_LONG_VIDEO_SECONDS) {
    throw new Error(`Total duration exceeds ${MAX_LONG_VIDEO_SECONDS} seconds`);
  }

  const longVideoGroupId = crypto.randomUUID();
  const aspectRatio = payload.aspectRatio === '9:16' ? '9:16' : '16:9';
  const wants1080p = payload.resolution === '1080p';
  const supports1080p = normalizedScenes.every(scene => scene.durationSeconds === 8);
  const resolution = wants1080p && supports1080p ? '1080p' : '720p';
  const qualityMode = payload.qualityMode === true;
  const ingredientPrompt = [payload.prompt, payload.continuitySpec, normalizedScenes[0]?.prompt]
    .filter(Boolean)
    .join('\n');

  const ingredientResult = await resolveVideoIngredients({
    boardId,
    productId: payload.productId,
    ingredientAssetIds: payload.ingredientAssetIds,
    referenceSelections: payload.referenceSelections,
    referenceMode: payload.referenceMode,
    prompt: ingredientPrompt,
    traceId,
    preferAvatar: true,
  });

  const referenceAssets = ingredientResult.referenceAssets || [];
  const avatarReferenceAsset = referenceAssets.find(asset => asset.type === 'avatar') || null;
  const bestIngredientAsset = selectBestIngredientAsset(referenceAssets);
  console.log(`[LONG-VIDEO ${traceId}] Ingredient references`, {
    selectedAssetIds: ingredientResult.selectedAssetIds,
    avatarAssetId: avatarReferenceAsset?.id || null,
    avatarReferenceSource: avatarReferenceAsset?.source || 'asset',
    bestIngredientAssetId: bestIngredientAsset?.id || null,
    referenceTypes: referenceAssets.map(asset => asset.type),
    referenceRoles: referenceAssets.map(asset => asset.role || null),
    referenceMode: payload.referenceMode || null
  });

  const sceneItemIds: string[] = [];
  const sceneVideos: string[] = [];
  let carryoverReference: VideoGenerationReferenceImage | null = null;
  let autoReferenceCount = 0;
  let continuityReference: VideoGenerationReferenceImage | null = null;

  if (qualityMode && payload.continuitySpec) {
    const continuityTraceId = `${traceId}-continuity`;
    const continuityPrompt = buildContinuityAnchorPrompt({
      continuitySpec: payload.continuitySpec,
      summaryPrompt: payload.prompt,
      aspectRatio,
    });
    const autoRefs = await generateAutoReferenceImages({
      boardId,
      prompt: continuityPrompt,
      aspectRatio,
      productId: payload.productId || null,
      traceId: continuityTraceId,
    });
    if (autoRefs.referenceImages.length > 0) {
      continuityReference = autoRefs.referenceImages[0];
      autoReferenceCount += 1;
    }
    if (autoRefs.warnings.length > 0) {
      console.warn(`[LONG-VIDEO ${continuityTraceId}] Continuity reference warnings:`, autoRefs.warnings);
    }
    if (continuityReference && avatarReferenceAsset) {
      console.log(`[LONG-VIDEO ${continuityTraceId}] Continuity reference generated alongside avatar asset`, {
        avatarAssetId: avatarReferenceAsset.id
      });
    }
  }

  for (let index = 0; index < normalizedScenes.length; index += 1) {
    const scene = normalizedScenes[index];
    const sceneIndex = index + 1;
    const sceneTraceId = `${traceId}-scene-${sceneIndex}`;
    const scenePrompt = buildScenePrompt(scene, {
      continuitySpec: payload.continuitySpec,
      summaryPrompt: payload.prompt,
      sceneIndex,
      sceneCount: normalizedScenes.length,
    });

    const promptWithGuardrails = applyVideoDurationGuardrails(applyLongVideoContinuityGuardrails(scenePrompt));
    const compiled = await compileVisualPromptWithIdentity({
      boardId,
      basePrompt: promptWithGuardrails,
      productId: payload.productId || null,
      traceId: sceneTraceId,
    });

    const primaryReference = avatarReferenceAsset?.referenceImage || continuityReference || null;
    const safeReferenceCandidates: VideoGenerationReferenceImage[] = [];
    let usedContinuityReference = false;
    let usedAvatarReference = false;

    if (primaryReference) {
      safeReferenceCandidates.push(primaryReference);
      usedAvatarReference = !!avatarReferenceAsset;
      usedContinuityReference = !avatarReferenceAsset && !!continuityReference;
    }

    if (qualityMode && carryoverReference) {
      safeReferenceCandidates.push(carryoverReference);
    }

    const fullReferenceCandidates = [...safeReferenceCandidates];
    if (bestIngredientAsset?.referenceImage) {
      fullReferenceCandidates.push(bestIngredientAsset.referenceImage);
    }

    let referenceImages = clampReferenceImages(fullReferenceCandidates);
    let safeReferenceImages = clampReferenceImages(safeReferenceCandidates);
    const usedCarryoverReference = !!(carryoverReference && referenceImages.includes(carryoverReference));
    const usedBestIngredient = !!(bestIngredientAsset?.referenceImage && referenceImages.includes(bestIngredientAsset.referenceImage));
    const usedPrimaryReference = !!(primaryReference && referenceImages.includes(primaryReference));

    console.log(`[LONG-VIDEO ${sceneTraceId}] Reference selection`, {
      primarySource: usedAvatarReference ? 'avatar' : (usedContinuityReference ? 'continuity' : 'none'),
      usedPrimaryReference,
      usedCarryoverReference,
      usedBestIngredient,
      referenceCount: referenceImages.length,
      safeReferenceCount: safeReferenceImages.length,
      avatarAssetId: avatarReferenceAsset?.id || null,
      avatarReferenceSource: avatarReferenceAsset?.source || 'asset',
      bestIngredientAssetId: bestIngredientAsset?.id || null
    });

    let autoReferenceUsed = usedContinuityReference;
    if (qualityMode && referenceImages.length === 0) {
      const autoRefs = await generateAutoReferenceImages({
        boardId,
        prompt: compiled.prompt,
        aspectRatio,
        productId: payload.productId || null,
        traceId: sceneTraceId,
      });
      if (autoRefs.referenceImages.length > 0) {
        referenceImages = clampReferenceImages(autoRefs.referenceImages);
        safeReferenceImages = referenceImages;
        autoReferenceUsed = true;
        autoReferenceCount += 1;
        console.log(`[LONG-VIDEO ${sceneTraceId}] Auto reference generated for scene`, {
          referenceCount: referenceImages.length
        });
      }
    }

    const allowVerticalReferences = qualityMode;
    const useIngredients = referenceImages.length > 0 && (aspectRatio === '16:9' || allowVerticalReferences);
    if (referenceImages.length > 0 && !useIngredients) {
      console.warn(`[LONG-VIDEO ${sceneTraceId}] Skipping references: aspect ratio ${aspectRatio} is not supported for reference images`);
    } else if (referenceImages.length > 0 && aspectRatio !== '16:9') {
      console.warn(`[LONG-VIDEO ${sceneTraceId}] Using references with vertical aspect ratio ${aspectRatio}`);
    }

    const config: VeoConfig = {
      aspectRatio,
      resolution,
      durationSeconds: scene.durationSeconds as 4 | 6 | 8,
      qualityMode,
    };

    let videoResult: string;
    let ingredientFailure: string | null = null;
    let retryAttempt = 0;
    const maxRetries = 2;
    let usedReferenceImages: VideoGenerationReferenceImage[] = [];
    let usedPrompt = compiled.prompt;

    const attemptGeneration = async (
      prompt: string,
      references: VideoGenerationReferenceImage[]
    ): Promise<string> => {
      return generateVeoVideo(
        prompt,
        config,
        references.length > 0 ? { referenceImages: references, traceId: sceneTraceId } : { traceId: sceneTraceId },
      );
    };

    const simplifyPrompt = (prompt: string): string => {
      return prompt
        .replace(/\[LONG VIDEO BRIEF\][^[]*/, '')
        .trim();
    };

    const hasSafeFallback = safeReferenceImages.length > 0 && safeReferenceImages.length < referenceImages.length;
    let referencesForAttempt = useIngredients ? referenceImages : [];
    let useSimplifiedPrompt = false;
    let usedSafeFallback = false;
    let droppedAllReferences = false;

    while (retryAttempt <= maxRetries) {
      const promptToUse = useSimplifiedPrompt ? simplifyPrompt(compiled.prompt) : compiled.prompt;
      if (retryAttempt > 0) {
        console.log(`[LONG-VIDEO ${sceneTraceId}] Retry attempt ${retryAttempt}/${maxRetries}`, {
          promptSimplified: useSimplifiedPrompt,
          referenceCount: referencesForAttempt.length
        });
      }

      try {
        videoResult = await attemptGeneration(promptToUse, referencesForAttempt);
        usedReferenceImages = referencesForAttempt;
        usedPrompt = promptToUse;
        break;
      } catch (error: any) {
        const errorMessage = error?.message || 'Video generation failed';
        const shouldSimplify = errorMessage.includes('No videos were generated');

        if (!ingredientFailure && referencesForAttempt.length > 0) {
          ingredientFailure = errorMessage;
        }

        if (!usedSafeFallback && hasSafeFallback) {
          usedSafeFallback = true;
          referencesForAttempt = safeReferenceImages;
          retryAttempt++;
          continue;
        }

        if (shouldSimplify && !useSimplifiedPrompt) {
          console.log(`[LONG-VIDEO ${sceneTraceId}] Scene failed (${errorMessage}), retrying with simplified prompt...`);
          useSimplifiedPrompt = true;
          retryAttempt++;
          continue;
        }

        if (!droppedAllReferences && referencesForAttempt.length > 0) {
          droppedAllReferences = true;
          referencesForAttempt = [];
          retryAttempt++;
          continue;
        }

        throw error;
      }
    }

    const sceneItemId = crypto.randomUUID();
    let storageKey: string | null = null;
    let contentToStore: string | null = videoResult;

    const uploadResult = await uploadGeneratedItem(boardId, sceneItemId, videoResult, 'video');
    if (uploadResult.success && uploadResult.storageKey) {
      storageKey = uploadResult.storageKey;
      contentToStore = null;
    }

    await db.insert(generatedItems).values({
      id: sceneItemId,
      boardId,
      type: 'video',
      content: contentToStore,
      storageKey: storageKey,
      title: scene.title || `Scene ${sceneIndex}`,
      metadata: {
        aspectRatio,
        resolution,
        prompt: usedPrompt.substring(0, 200),
        productId: payload.productId || null,
        ingredientAssetIds: ingredientResult.selectedAssetIds,
        qualityMode,
        referenceCount: usedReferenceImages.length,
        autoReferenceUsed,
        ingredientFallback: !!ingredientFailure,
        ingredientError: ingredientFailure,
        durationSeconds: scene.durationSeconds,
        sceneIndex,
        sceneCount: normalizedScenes.length,
        isScene: true,
        longVideoGroupId,
        traceId: sceneTraceId,
      },
    });

    sceneItemIds.push(sceneItemId);
    sceneVideos.push(videoResult);

    if (qualityMode) {
      try {
        const frame = await extractLastFrame(videoResult, { traceId: sceneTraceId });
        carryoverReference = toReferenceImage(frame);
        console.log(`[LONG-VIDEO ${sceneTraceId}] Carryover reference captured`);
      } catch (error) {
        console.warn(`[LONG-VIDEO ${sceneTraceId}] Failed to capture carryover reference`, error);
        carryoverReference = null;
      }
    }
  }

  const stitchedVideo = await stitchVideoClips(sceneVideos, { traceId });
  const finalItemId = crypto.randomUUID();
  let finalStorageKey: string | null = null;
  let finalContent: string | null = stitchedVideo;

  const finalUpload = await uploadGeneratedItem(boardId, finalItemId, stitchedVideo, 'video');
  if (finalUpload.success && finalUpload.storageKey) {
    finalStorageKey = finalUpload.storageKey;
    finalContent = null;
  }

  await db.insert(generatedItems).values({
    id: finalItemId,
    boardId,
    type: 'video',
    content: finalContent,
    storageKey: finalStorageKey,
    title: payload.title || 'Long Video',
    metadata: {
      aspectRatio,
      resolution,
      prompt: payload.prompt || normalizedScenes[0]?.prompt || '',
      productId: payload.productId || null,
      ingredientAssetIds: ingredientResult.selectedAssetIds,
      qualityMode,
      sceneItemIds,
      sceneCount: normalizedScenes.length,
      totalDurationSeconds,
      autoReferenceUsedCount: autoReferenceCount,
      continuitySpec: payload.continuitySpec || null,
      scenePrompts: normalizedScenes.map(scene => scene.prompt).slice(0, 5),
      longVideoGroupId,
      isLongVideo: true,
      hook: payload.hook || null,
      caption: payload.caption || null,
      traceId,
    },
  });

  return {
    finalItemId,
    sceneItemIds,
    sceneCount: normalizedScenes.length,
    totalDurationSeconds,
  };
}
