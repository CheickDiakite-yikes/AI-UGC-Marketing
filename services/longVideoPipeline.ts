import { VideoGenerationReferenceImage, VideoGenerationReferenceType } from '@google/genai';
import { db } from '@/db';
import { generatedItems } from '@/db/schema';
import { VeoConfig } from '@/types';
import { uploadGeneratedItem } from '@/services/objectStorageService';
import { compileVisualPromptWithIdentity } from '@/services/identityPromptService';
import { applyVideoDurationGuardrails } from '@/services/videoPromptUtils';
import { resolveVideoIngredients } from '@/services/videoIngredientService';
import { generateAutoReferenceImages } from '@/services/videoReferenceService';
import { generateVeoVideo } from '@/services/geminiService';
import { extractLastFrame, stitchVideoClips } from '@/services/videoStitchService';

const MAX_LONG_VIDEO_SECONDS = 30;
const SUPPORTED_DURATIONS = new Set([4, 6, 8]);

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

const toReferenceImage = (frame: { base64: string; mimeType: string }): VideoGenerationReferenceImage => ({
  image: {
    imageBytes: frame.base64,
    mimeType: frame.mimeType,
  },
  referenceType: VideoGenerationReferenceType.ASSET,
});

const clampReferenceImages = (images: VideoGenerationReferenceImage[]) => images.slice(0, 3);

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

  const ingredientResult = await resolveVideoIngredients({
    boardId,
    productId: payload.productId,
    ingredientAssetIds: payload.ingredientAssetIds,
    prompt: payload.prompt || normalizedScenes[0]?.prompt,
    traceId,
  });

  let baseReferences = ingredientResult.referenceImages;
  if (baseReferences.length > 0) {
    baseReferences = clampReferenceImages(baseReferences);
  }

  const sceneItemIds: string[] = [];
  const sceneVideos: string[] = [];
  let carryoverReference: VideoGenerationReferenceImage | null = null;
  let autoReferenceCount = 0;

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

    const promptWithGuardrails = applyVideoDurationGuardrails(scenePrompt);
    const compiled = await compileVisualPromptWithIdentity({
      boardId,
      basePrompt: promptWithGuardrails,
      productId: payload.productId || null,
      traceId: sceneTraceId,
    });

    let referenceImages = baseReferences.length > 0 ? [...baseReferences] : [];
    if (qualityMode && carryoverReference) {
      referenceImages = clampReferenceImages([carryoverReference, ...referenceImages]);
    }

    let autoReferenceUsed = false;
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
        autoReferenceUsed = true;
        autoReferenceCount += 1;
      }
    }

    const allowVerticalReferences = qualityMode;
    const useIngredients = referenceImages.length > 0 && (aspectRatio === '16:9' || allowVerticalReferences);

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
    
    const attemptGeneration = async (prompt: string, withIngredients: boolean): Promise<string> => {
      return generateVeoVideo(
        prompt,
        config,
        withIngredients ? { referenceImages, traceId: sceneTraceId } : { traceId: sceneTraceId },
      );
    };
    
    const simplifyPrompt = (prompt: string): string => {
      // Remove potentially problematic content for retry
      return prompt
        .replace(/\[LONG VIDEO BRIEF\][^[]*/, '')
        .replace(/\[CONTINUITY SPEC\][^[]*/, '')
        .trim();
    };
    
    while (retryAttempt <= maxRetries) {
      try {
        const promptToUse = retryAttempt > 0 ? simplifyPrompt(compiled.prompt) : compiled.prompt;
        const useIngredientsForAttempt = useIngredients && retryAttempt === 0;
        
        if (retryAttempt > 0) {
          console.log(`[LONG-VIDEO ${sceneTraceId}] Retry attempt ${retryAttempt}/${maxRetries}`);
        }
        
        videoResult = await attemptGeneration(promptToUse, useIngredientsForAttempt);
        break; // Success, exit retry loop
      } catch (error: any) {
        const errorMessage = error?.message || 'Video generation failed';
        
        if (retryAttempt === 0 && useIngredients) {
          // First failure with ingredients - try without
          ingredientFailure = errorMessage;
          retryAttempt++;
          continue;
        }
        
        if (retryAttempt < maxRetries && errorMessage.includes('No videos were generated')) {
          // Content moderation issue - retry with simplified prompt
          console.log(`[LONG-VIDEO ${sceneTraceId}] Scene failed (${errorMessage}), retrying with simplified prompt...`);
          retryAttempt++;
          continue;
        }
        
        // All retries exhausted
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
        prompt: compiled.prompt.substring(0, 200),
        productId: payload.productId || null,
        ingredientAssetIds: ingredientResult.selectedAssetIds,
        qualityMode,
        referenceCount: referenceImages.length,
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
      } catch (error) {
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
