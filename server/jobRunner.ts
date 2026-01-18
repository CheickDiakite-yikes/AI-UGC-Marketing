import { getPendingJobs, claimJob, updateJobStatus } from '../services/jobService';
import { generateMarketingImage, generateVeoVideo } from '../services/geminiService';
import { compileVisualPromptWithIdentity } from '../services/identityPromptService';
import { resolveVideoIngredients } from '../services/videoIngredientService';
import { applyVideoDurationGuardrails } from '../services/videoPromptUtils';
import { generateAutoReferenceImages } from '../services/videoReferenceService';
import { uploadGeneratedItem } from '../services/objectStorageService';
import { db } from '../db';
import { generatedItems, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AspectRatio, VeoConfig, PlanTier } from '../types';
import { getPlanLimits } from '../services/subscriptionPlans';
import { getRemainingImages, getRemainingVideos } from '../services/usageLimits';
import { consumeUsage } from '../services/usageConsumption';

const POLL_INTERVAL = 5000;

interface Job {
  id: string;
  boardId: string;
  userId: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface JobResult {
  content?: string;
  type: string;
  status?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

const assertImageQuota = async (userId: string, count: number = 1) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { imagesGenerated: true, planTier: true, creditBalance: true }
  });
  if (!user) {
    throw new Error('User not found for quota check');
  }
  const { imageLimit } = getPlanLimits((user.planTier as PlanTier) || 'free');
  const remaining = getRemainingImages(user.imagesGenerated, imageLimit, user.creditBalance || 0);
  if (remaining < count) {
    throw new Error('Image quota exceeded');
  }
};

const assertVideoQuota = async (userId: string, count: number = 1) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { videosGenerated: true, planTier: true, creditBalance: true }
  });
  if (!user) {
    throw new Error('User not found for quota check');
  }
  const { videoLimit } = getPlanLimits((user.planTier as PlanTier) || 'free');
  if (videoLimit <= 0) {
    throw new Error('Video generation requires a subscription');
  }
  const remaining = getRemainingVideos(user.videosGenerated, videoLimit, user.creditBalance || 0);
  if (remaining < count) {
    throw new Error('Video quota exceeded');
  }
};

async function processImageJob(job: Job): Promise<JobResult> {
  const payload = job.payload as { prompt: string; aspectRatio?: string; imageSize?: string; title?: string; caption?: string; hook?: string; archetype?: string; productId?: string; traceId?: string };
  const { prompt, aspectRatio, title, caption, hook, archetype, productId } = payload;
  const traceId = payload.traceId || crypto.randomUUID();
  
  await assertImageQuota(job.userId, 1);
  
  const aspectRatioValue = (aspectRatio as AspectRatio) || AspectRatio.SQUARE;
  
  const compiled = await compileVisualPromptWithIdentity({
    boardId: job.boardId,
    basePrompt: prompt,
    productId,
    traceId
  });

  console.log(`[JOB RUNNER ${traceId}] Generating image with prompt: "${compiled.prompt.substring(0, 50)}..."`);
  
  const imageResult = await generateMarketingImage(compiled.prompt, aspectRatioValue);
  
  const itemId = crypto.randomUUID();
  let storageKey: string | null = null;
  let contentToStore: string | null = imageResult;
  
  const uploadResult = await uploadGeneratedItem(job.boardId, itemId, imageResult, 'image');
  if (uploadResult.success && uploadResult.storageKey) {
    storageKey = uploadResult.storageKey;
    contentToStore = null;
  }
  
  const [saved] = await db.insert(generatedItems).values({
    id: itemId,
    boardId: job.boardId,
    type: 'image',
    content: contentToStore,
    storageKey: storageKey,
    title: title || 'Generated Image',
    metadata: {
      aspectRatio,
      jobId: job.id,
      prompt: compiled.prompt.substring(0, 200),
      productId: compiled.productIdUsed || productId || null,
      caption: caption || null,
      hook: hook || null,
      archetype: archetype || null,
      traceId
    },
  }).returning();
  
  try {
    await consumeUsage(job.userId, 'image', 1);
  } catch (error) {
    console.warn('[JOB RUNNER] Failed to apply image usage charge', error);
  }
  
  console.log(`[JOB RUNNER] Saved image ${itemId} to database`);
  
  return { 
    content: storageKey ? `/api/storage/${encodeURIComponent(storageKey)}` : imageResult, 
    type: 'image',
    itemId: saved.id
  };
}

async function processVideoJob(job: Job): Promise<JobResult> {
  const payload = job.payload as {
    prompt: string;
    aspectRatio?: string;
    resolution?: string;
    title?: string;
    caption?: string;
    hook?: string;
    archetype?: string;
    productId?: string;
    ingredientAssetIds?: string[];
    qualityMode?: boolean;
    traceId?: string;
  };
  const { prompt, aspectRatio, resolution, title, caption, hook, archetype, productId, ingredientAssetIds } = payload;
  const traceId = payload.traceId || crypto.randomUUID();
  const qualityMode = payload.qualityMode === true;

  await assertVideoQuota(job.userId, 1);
  
  const config: VeoConfig = {
    aspectRatio: (aspectRatio === '9:16' ? '9:16' : '16:9'),
    resolution: (resolution === '1080p' ? '1080p' : '720p'),
    durationSeconds: 8,
    qualityMode
  };
  
  console.log(`[JOB RUNNER ${traceId}] Generating video (quality=${qualityMode}) with prompt: "${prompt.substring(0, 50)}..."`);

  let referenceImages = [];
  let selectedIngredientIds: string[] = [];
  let productIdUsed: string | undefined;
  let autoReferenceUsed = false;

  try {
    const ingredientResult = await resolveVideoIngredients({
      boardId: job.boardId,
      productId,
      ingredientAssetIds,
      prompt,
      traceId
    });
    referenceImages = ingredientResult.referenceImages;
    selectedIngredientIds = ingredientResult.selectedAssetIds;
    productIdUsed = ingredientResult.productIdUsed;
    if (ingredientResult.warnings.length > 0) {
      console.warn(`[JOB RUNNER ${traceId}] Ingredient warnings:`, ingredientResult.warnings);
    }
  } catch (error) {
    console.error(`[JOB RUNNER ${traceId}] Ingredient resolution failed:`, error);
  }

  if (qualityMode && referenceImages.length === 0) {
    const autoRefs = await generateAutoReferenceImages({
      boardId: job.boardId,
      prompt,
      aspectRatio: config.aspectRatio,
      productId: productIdUsed || productId || null,
      traceId
    });
    if (autoRefs.referenceImages.length > 0) {
      referenceImages = autoRefs.referenceImages;
      autoReferenceUsed = true;
    }
    if (autoRefs.warnings.length > 0) {
      console.warn(`[JOB RUNNER ${traceId}] Auto-reference warnings:`, autoRefs.warnings);
    }
  }

  const allowVerticalReferences = qualityMode;
  const useIngredients = referenceImages.length > 0 && (config.aspectRatio === '16:9' || allowVerticalReferences);
  if (referenceImages.length > 0 && !useIngredients) {
    console.warn(`[JOB RUNNER ${traceId}] Skipping references: aspect ratio ${config.aspectRatio} is not supported for reference images`);
  } else if (referenceImages.length > 0 && config.aspectRatio !== '16:9') {
    console.warn(`[JOB RUNNER ${traceId}] Using references with vertical aspect ratio ${config.aspectRatio}`);
  }
  
  const promptWithGuardrails = applyVideoDurationGuardrails(prompt);
  const compiled = await compileVisualPromptWithIdentity({
    boardId: job.boardId,
    basePrompt: promptWithGuardrails,
    productId: productIdUsed || productId || null,
    traceId
  });

  let videoResult: string;
  let ingredientFailure: string | null = null;
  try {
    videoResult = await generateVeoVideo(
      compiled.prompt,
      config,
      useIngredients ? { referenceImages, traceId } : { traceId }
    );
  } catch (error: any) {
    if (!useIngredients) {
      throw error;
    }
    ingredientFailure = error?.message || 'Ingredient video generation failed';
    console.warn(`[JOB RUNNER ${traceId}] Ingredient generation failed, retrying without references: ${ingredientFailure}`);
    videoResult = await generateVeoVideo(
      compiled.prompt,
      config,
      { traceId }
    );
  }
  
  const itemId = crypto.randomUUID();
  let storageKey: string | null = null;
  let contentToStore: string | null = videoResult;
  
  const uploadResult = await uploadGeneratedItem(job.boardId, itemId, videoResult, 'video');
  if (uploadResult.success && uploadResult.storageKey) {
    storageKey = uploadResult.storageKey;
    contentToStore = null;
  }
  
  const [saved] = await db.insert(generatedItems).values({
    id: itemId,
    boardId: job.boardId,
    type: 'video',
    content: contentToStore,
    storageKey: storageKey,
    title: title || 'Generated Video',
    metadata: {
      aspectRatio,
      resolution,
      jobId: job.id,
      prompt: compiled.prompt.substring(0, 200),
      productId: productIdUsed || productId || null,
      ingredientAssetIds: selectedIngredientIds,
      qualityMode,
      autoReferenceUsed,
      referenceCount: useIngredients ? referenceImages.length : 0,
      caption: caption || null,
      hook: hook || null,
      archetype: archetype || null,
      ingredientFallback: !!ingredientFailure,
      ingredientError: ingredientFailure,
      traceId
    },
  }).returning();
  
  try {
    await consumeUsage(job.userId, 'video', 1);
  } catch (error) {
    console.warn('[JOB RUNNER] Failed to apply video usage charge', error);
  }
  
  console.log(`[JOB RUNNER ${traceId}] Saved video ${itemId} to database`);
  
  return { 
    content: storageKey ? `/api/storage/${encodeURIComponent(storageKey)}` : videoResult, 
    type: 'video',
    itemId: saved.id
  };
}

async function processCampaignJob(job: Job): Promise<JobResult> {
  console.log(`[JOB RUNNER] Processing campaign job`);
  return { status: 'ready_for_chat', type: 'campaign', payload: job.payload };
}

async function processJob(job: Job): Promise<void> {
  console.log(`[JOB RUNNER] Processing job ${job.id} of type ${job.type}`);
  
  try {
    let result: JobResult;
    
    switch (job.type) {
      case 'generate_image':
        result = await processImageJob(job);
        break;
      case 'generate_video':
        result = await processVideoJob(job);
        break;
      case 'generate_campaign':
        result = await processCampaignJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
    
    await updateJobStatus(job.id, 'completed', result);
    console.log(`[JOB RUNNER] Job ${job.id} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[JOB RUNNER] Job ${job.id} failed:`, errorMessage);
    await updateJobStatus(job.id, 'failed', undefined, errorMessage);
  }
}

async function runJobLoop(): Promise<void> {
  console.log('[JOB RUNNER] Starting background job runner...');
  
  while (true) {
    try {
      const pendingJobs = await getPendingJobs(1);
      
      if (pendingJobs.length > 0) {
        const job = pendingJobs[0] as Job;
        console.log(`[JOB RUNNER] Found pending job ${job.id}, attempting to claim...`);
        
        const claimed = await claimJob(job.id);
        
        if (claimed) {
          console.log(`[JOB RUNNER] Successfully claimed job ${job.id}`);
          await processJob(claimed as Job);
        } else {
          console.log(`[JOB RUNNER] Failed to claim job ${job.id} (already claimed by another worker)`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[JOB RUNNER] Error in job loop:', errorMessage);
    }
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

runJobLoop();
