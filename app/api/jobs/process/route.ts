import { NextRequest, NextResponse } from 'next/server';
import { getPendingJobs, claimJob, updateJobStatus } from '../../../../services/jobService';
import { generateMarketingImage, generateVeoVideo } from '../../../../services/geminiService';
import { compileVisualPromptWithIdentity } from '../../../../services/identityPromptService';
import { compileVisualPromptWithIdentity } from '../../../../services/identityPromptService';
import { resolveVideoIngredients } from '../../../../services/videoIngredientService';
import { uploadGeneratedItem } from '../../../../services/objectStorageService';
import { db } from '../../../../db';
import { generatedItems, users } from '../../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { AspectRatio, VeoConfig } from '../../../../types';

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

  console.log(`[API JOB PROCESSOR ${traceId}] Generating image...`);
  
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
  
  console.log(`[API JOB PROCESSOR] Saved image ${itemId}`);
  
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
  
  console.log(`[API JOB PROCESSOR ${traceId}] Generating video...`);

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
      console.warn(`[API JOB PROCESSOR ${traceId}] Ingredient warnings:`, ingredientResult.warnings);
    }
  } catch (error) {
    console.error(`[API JOB PROCESSOR ${traceId}] Ingredient resolution failed:`, error);
  }

  const useIngredients = referenceImages.length > 0 && config.aspectRatio === '16:9';
  if (referenceImages.length > 0 && config.aspectRatio !== '16:9') {
    console.warn(`[API JOB PROCESSOR ${traceId}] Skipping ingredients: aspect ratio ${config.aspectRatio} is not supported for reference images`);
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
    console.warn(`[API JOB PROCESSOR ${traceId}] Ingredient generation failed, retrying without references: ${ingredientFailure}`);
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
  
  console.log(`[API JOB PROCESSOR ${traceId}] Saved video ${itemId}`);
  
  return { 
    content: storageKey ? `/api/storage/${encodeURIComponent(storageKey)}` : videoResult, 
    type: 'video',
    itemId: saved.id
  };
}

async function processCarouselJob(job: Job): Promise<JobResult> {
  const payload = job.payload as { 
    slides: Array<{ prompt: string }>; 
    aspectRatio?: string; 
    title?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };
  const { slides, aspectRatio, title, description, metadata } = payload;
  
  console.log(`[API JOB PROCESSOR] Generating carousel with ${slides.length} slides...`);
  
  const aspectRatioValue = (aspectRatio as AspectRatio) || AspectRatio.PORTRAIT;
  const itemId = crypto.randomUUID();
  const slideUrls: string[] = [];
  let coverUrl: string | null = null;
  
  for (let i = 0; i < slides.length; i++) {
    const slidePrompt = slides[i].prompt;
    console.log(`[API JOB PROCESSOR] Generating slide ${i + 1}/${slides.length}...`);
    
    try {
      const slideImage = await generateMarketingImage(slidePrompt, aspectRatioValue);
      const slideKey = `boards/${job.boardId}/generated/${itemId}_slide${i + 1}.png`;
      const uploadResult = await uploadGeneratedItem(job.boardId, `${itemId}_slide${i + 1}`, slideImage, 'image');
      
      if (uploadResult.success && uploadResult.storageKey) {
        const slideUrl = `/api/storage/${encodeURIComponent(uploadResult.storageKey)}`;
        slideUrls.push(slideUrl);
        if (i === 0) coverUrl = slideUrl;
      } else {
        slideUrls.push(slideImage);
        if (i === 0) coverUrl = slideImage;
      }
    } catch (err) {
      console.error(`[API JOB PROCESSOR] Failed to generate slide ${i + 1}:`, err);
      throw err;
    }
  }
  
  const [saved] = await db.insert(generatedItems).values({
    id: itemId,
    boardId: job.boardId,
    type: 'carousel',
    content: coverUrl,
    carouselUrls: slideUrls,
    title: title || 'Generated Carousel',
    description: description,
    metadata: { ...metadata, aspectRatio, jobId: job.id, slideCount: slides.length },
  }).returning();
  
  await db.update(users)
    .set({ imagesGenerated: sql`${users.imagesGenerated} + ${slides.length}` })
    .where(eq(users.id, job.userId));
  
  console.log(`[API JOB PROCESSOR] Saved carousel ${itemId} with ${slideUrls.length} slides`);
  
  return { 
    content: coverUrl, 
    type: 'carousel',
    itemId: saved.id,
    carouselUrls: slideUrls
  };
}

export async function POST(request: NextRequest) {
  try {
    const pendingJobs = await getPendingJobs(1);
    
    if (pendingJobs.length === 0) {
      return NextResponse.json({ processed: false, message: 'No pending jobs' });
    }
    
    const job = pendingJobs[0] as Job;
    console.log(`[API JOB PROCESSOR] Found job ${job.id} of type ${job.type}`);
    
    const claimed = await claimJob(job.id);
    if (!claimed) {
      return NextResponse.json({ processed: false, message: 'Job already claimed' });
    }
    
    console.log(`[API JOB PROCESSOR] Claimed job ${job.id}, processing...`);
    
    try {
      let result: JobResult;
      
      switch (job.type) {
        case 'generate_image':
          result = await processImageJob(claimed as Job);
          break;
        case 'generate_video':
          result = await processVideoJob(claimed as Job);
          break;
        case 'generate_carousel':
          result = await processCarouselJob(claimed as Job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      
      await updateJobStatus(job.id, 'completed', result);
      console.log(`[API JOB PROCESSOR] Job ${job.id} completed`);
      
      return NextResponse.json({ 
        processed: true, 
        jobId: job.id, 
        type: job.type,
        result 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[API JOB PROCESSOR] Job ${job.id} failed:`, errorMessage);
      await updateJobStatus(job.id, 'failed', undefined, errorMessage);
      
      return NextResponse.json({ 
        processed: true, 
        jobId: job.id, 
        failed: true, 
        error: errorMessage 
      });
    }
  } catch (error) {
    console.error('[API JOB PROCESSOR] Error:', error);
    return NextResponse.json({ error: 'Failed to process job' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const pendingJobs = await getPendingJobs(10);
    return NextResponse.json({ 
      pendingCount: pendingJobs.length,
      jobs: pendingJobs.map((j: any) => ({ id: j.id, type: j.type, status: j.status }))
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get jobs' }, { status: 500 });
  }
}
