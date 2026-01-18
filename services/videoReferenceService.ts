import { VideoGenerationReferenceImage, VideoGenerationReferenceType } from '@google/genai';
import { AspectRatio } from '@/types';
import { compileVisualPromptWithIdentity } from './identityPromptService';
import { generateReferenceImage } from './geminiService';

const REFERENCE_FRAME_BLOCK = [
  "[REFERENCE FRAME]",
  "- Single photorealistic still frame that matches the video prompt.",
  "- Keep subject identity consistent; accurate anatomy with no extra limbs.",
  "- Hands and fingers must be visible and natural when touching objects.",
  "- Realistic physics and contact; no floating, clipping, or warped geometry.",
  "- No on-screen text or subtitles unless explicitly requested in the prompt.",
  "- Minimal motion blur; keep the subject crisp and in focus."
].join("\n");

const normalizeAspectRatio = (aspectRatio?: string): AspectRatio =>
  aspectRatio === '9:16' ? AspectRatio.PORTRAIT : AspectRatio.LANDSCAPE;

const logTrace = (traceId: string, message: string, data?: unknown) => {
  if (data !== undefined) {
    console.log(`[VIDEO-REFERENCE ${traceId}] ${message}`, data);
  } else {
    console.log(`[VIDEO-REFERENCE ${traceId}] ${message}`);
  }
};

export async function generateAutoReferenceImages(params: {
  boardId: string;
  prompt: string;
  aspectRatio?: string;
  productId?: string | null;
  traceId: string;
}): Promise<{ referenceImages: VideoGenerationReferenceImage[]; warnings: string[] }> {
  const { boardId, prompt, aspectRatio, productId, traceId } = params;
  const warnings: string[] = [];

  if (!prompt || !prompt.trim()) {
    warnings.push('Missing prompt for reference image generation');
    return { referenceImages: [], warnings };
  }

  const referencePrompt = `${prompt.trim()}\n\n${REFERENCE_FRAME_BLOCK}`;

  try {
    const compiled = await compileVisualPromptWithIdentity({
      boardId,
      basePrompt: referencePrompt,
      productId: productId || null,
      traceId
    });

    const reference = await generateReferenceImage(compiled.prompt, normalizeAspectRatio(aspectRatio));
    const referenceImages: VideoGenerationReferenceImage[] = [
      {
        image: {
          imageBytes: reference.base64,
          mimeType: reference.mimeType
        },
        referenceType: VideoGenerationReferenceType.ASSET
      }
    ];

    logTrace(traceId, 'Generated auto reference frame');
    return { referenceImages, warnings };
  } catch (error: any) {
    const message = error?.message || 'Failed to generate reference frame';
    warnings.push(message);
    logTrace(traceId, 'Auto reference generation failed', message);
    return { referenceImages: [], warnings };
  }
}
