import { getPendingJobs, claimJob, updateJobStatus } from '../services/jobService';
import { generateMarketingImage, generateVeoVideo } from '../services/geminiService';
import { compileVisualPromptWithIdentity } from '../services/identityPromptService';
import { resolveVideoIngredients } from '../services/videoIngredientService';
import { uploadGeneratedItem } from '../services/objectStorageService';
import { db } from '../db';
import { generatedItems, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { AspectRatio, VeoConfig } from '../types';

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

async function processImageJob(job: Job): Promise<JobResult> {
  const payload = job.payload as { prompt: string; aspectRatio?: string; imageSize?: string; title?: string; caption?: string; hook?: string; archetype?: string; productId?: string; traceId?: string };
  const { prompt, aspectRatio, title, caption, hook, archetype, productId } = payload;
  const traceId = payload.traceId || crypto.randomUUID();
  
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
  
  await db.update(users)
    .set({ imagesGenerated: sql`${users.imagesGenerated} + 1` })
    .where(eq(users.id, job.userId));
  
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
    traceId?: string;
  };
  const { prompt, aspectRatio, resolution, title, caption, hook, archetype, productId, ingredientAssetIds } = payload;
  const traceId = payload.traceId || crypto.randomUUID();
  
  const config: VeoConfig = {
    aspectRatio: (aspectRatio === '9:16' ? '9:16' : '16:9'),
    resolution: (resolution === '1080p' ? '1080p' : '720p'),
    durationSeconds: 8
  };
  
  console.log(`[JOB RUNNER ${traceId}] Generating video with prompt: "${prompt.substring(0, 50)}..."`);

  let referenceImages = [];
  let selectedIngredientIds: string[] = [];
  let productIdUsed: string | undefined;

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

  const useIngredients = referenceImages.length > 0 && config.aspectRatio === '16:9';
  if (referenceImages.length > 0 && config.aspectRatio !== '16:9') {
    console.warn(`[JOB RUNNER ${traceId}] Skipping ingredients: aspect ratio ${config.aspectRatio} is not supported for reference images`);
  }
  
  const compiled = await compileVisualPromptWithIdentity({
    boardId: job.boardId,
    basePrompt: prompt,
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
      caption: caption || null,
      hook: hook || null,
      archetype: archetype || null,
      ingredientFallback: !!ingredientFailure,
      ingredientError: ingredientFailure,
      traceId
    },
  }).returning();
  
  await db.update(users)
    .set({ videosGenerated: sql`${users.videosGenerated} + 1` })
    .where(eq(users.id, job.userId));
  
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
