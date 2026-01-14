import { getPendingJobs, claimJob, updateJobStatus } from '../services/jobService';
import { generateMarketingImage, generateVeoVideo } from '../services/geminiService';
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
  const payload = job.payload as { prompt: string; aspectRatio?: string; imageSize?: string };
  const { prompt, aspectRatio, imageSize } = payload;
  
  const aspectRatioValue = (aspectRatio as AspectRatio) || AspectRatio.SQUARE;
  
  console.log(`[JOB RUNNER] Generating image with prompt: "${prompt.substring(0, 50)}..."`);
  
  const imageResult = await generateMarketingImage(prompt, aspectRatioValue);
  
  return { content: imageResult, type: 'image' };
}

async function processVideoJob(job: Job): Promise<JobResult> {
  const payload = job.payload as { prompt: string; aspectRatio?: string; resolution?: string };
  const { prompt, aspectRatio, resolution } = payload;
  
  const config: VeoConfig = {
    aspectRatio: (aspectRatio === '9:16' ? '9:16' : '16:9'),
    resolution: (resolution === '1080p' ? '1080p' : '720p')
  };
  
  console.log(`[JOB RUNNER] Generating video with prompt: "${prompt.substring(0, 50)}..."`);
  
  const videoResult = await generateVeoVideo(prompt, config);
  
  return { content: videoResult, type: 'video' };
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
