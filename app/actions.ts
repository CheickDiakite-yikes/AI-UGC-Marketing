'use server';

import { GoogleGenAI } from '@google/genai';
import type { VideoGenerationReferenceImage } from '@google/genai';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("Server Warning: GOOGLE_GEMINI_API_KEY is not set.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });

export async function generateContentServer(model: string, contents: any, config: any) {
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured on the server.");

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
            config
        });
        const text = response.text;
        return {
            text,
            candidates: response.candidates,
        };

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        throw new Error(error.message || "Failed to generate content");
    }
}

export async function generateContentWithUrlContext(url: string, prompt: string) {
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured on the server.");

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [`${prompt}\n\nAnalyze and extract information from this URL: ${url}`],
            config: {
                tools: [{ urlContext: {} }],
            },
        });

        const urlContextMetadata = (response.candidates?.[0] as any)?.urlContextMetadata;
        const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
        
        return {
            text: response.text,
            urlContextMetadata,
            groundingMetadata,
            candidates: response.candidates,
        };
    } catch (error: any) {
        console.error("Gemini URL Context API Error:", error);
        throw new Error(error.message || "Failed to fetch URL content");
    }
}

export async function generateContentWithSearch(prompt: string, searchEnabled: boolean = true) {
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured on the server.");

    try {
        const config: any = {};
        if (searchEnabled) {
            config.tools = [{ googleSearch: {} }];
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [prompt],
            config,
        });

        const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
        
        return {
            text: response.text,
            groundingMetadata,
            candidates: response.candidates,
        };
    } catch (error: any) {
        console.error("Gemini Search API Error:", error);
        throw new Error(error.message || "Failed to search");
    }
}

export async function generateImagesServer(
    model: string, 
    prompt: string, 
    config: any,
    referenceImages?: Array<{ mimeType: string; base64: string; role?: string }>
) {
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured on the server.");
    
    try {
        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
        
        if (referenceImages && referenceImages.length > 0) {
            const validImages = referenceImages.filter(img => {
                if (!img.mimeType?.startsWith('image/')) return false;
                if (!img.base64 || img.base64.length < 100) return false;
                if (img.base64.length > 10 * 1024 * 1024) return false;
                return true;
            });

            if (validImages.length > 0) {
                const imageContextParts: string[] = [];
                const hasLogo = validImages.some(img => img.role === 'logo');
                const hasBrandImages = validImages.some(img => img.role === 'brand_image');
                const hasAvatar = validImages.some(img => img.role === 'avatar');
                
                if (hasLogo) imageContextParts.push('Incorporate the brand logo prominently and accurately in the generated image.');
                if (hasBrandImages) imageContextParts.push('Use the brand imagery as visual style reference for colors, aesthetics, and mood.');
                if (hasAvatar) imageContextParts.push('CRITICAL: Use the provided avatar/spokesperson photo as the EXACT visual reference for any person in this image. The generated person must closely match the face, features, skin tone, and overall appearance of the reference photo.');
                
                parts.push({ text: `${prompt}\n\nIMPORTANT: Reference images are provided below. ${imageContextParts.join(' ')}` });
                
                for (const img of validImages) {
                    parts.push({
                        inlineData: {
                            mimeType: img.mimeType,
                            data: img.base64
                        }
                    });
                }
            } else {
                parts.push({ text: prompt });
            }
        } else {
            parts.push({ text: prompt });
        }
        
        console.log(`[GENERATE_IMAGES_SERVER] Generating with ${parts.length} parts (${parts.filter(p => p.inlineData).length} images)`);
        
        const response = await ai.models.generateContent({
            model,
            contents: parts,
            config
        });
        
        // Extract image data properly for serialization
        const candidates = response.candidates?.map(candidate => ({
            content: {
                parts: candidate.content?.parts?.map(part => {
                    if (part.inlineData) {
                        return {
                            inlineData: {
                                mimeType: part.inlineData.mimeType,
                                data: part.inlineData.data
                            }
                        };
                    }
                    if (part.text) {
                        return { text: part.text };
                    }
                    return part;
                }) || []
            }
        })) || [];
        
        return {
            text: response.text,
            candidates
        };
    } catch (error: any) {
        console.error("Gemini Image API Error:", error);
        throw new Error(error.message || "Failed to generate image");
    }
}

export async function generateVideoServer(
    prompt: string,
    config: {
        aspectRatio?: '16:9' | '9:16';
        resolution?: '720p' | '1080p';
        durationSeconds?: 4 | 6 | 8;
        qualityMode?: boolean;
        referenceImages?: VideoGenerationReferenceImage[];
        traceId?: string;
    }
): Promise<string> {
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured on the server.");
    
    try {
        const traceId = config.traceId || 'no-trace';
        const useIngredients = !!(config.referenceImages && config.referenceImages.length > 0);
        const forceQuality = config.qualityMode === true;
        const model = (useIngredients || forceQuality) ? "veo-3.1-generate-preview" : "veo-3.1-fast-generate-preview";
        const durationSeconds = config.durationSeconds || ((useIngredients || forceQuality) ? 8 : undefined);

        console.log(`[Veo 3.1 ${traceId}] Starting video generation (quality=${forceQuality}, references=${useIngredients}) with prompt:`, prompt.substring(0, 100) + "...");
        
        // Use veo-3.1-fast-generate-preview for faster generation; use veo-3.1-generate-preview for higher quality or reference-based runs.
        let operation = await ai.models.generateVideos({
            model,
            prompt: prompt,
            config: {
                aspectRatio: config.aspectRatio || "16:9",
                resolution: config.resolution || "720p",
                durationSeconds: durationSeconds,
                referenceImages: useIngredients ? config.referenceImages : undefined
            },
        });

        console.log(`[Veo 3.1 ${traceId}] Video generation started, polling for completion...`);
        
        // Poll for completion (timeout after 5 minutes)
        const startTime = Date.now();
        const timeout = 5 * 60 * 1000; // 5 minutes
        
        while (!operation.done) {
            if (Date.now() - startTime > timeout) {
                throw new Error("Video generation timed out after 5 minutes");
            }
            
            console.log(`[Veo 3.1 ${traceId}] Still generating... waiting 10 seconds`);
            await new Promise((resolve) => setTimeout(resolve, 10000));
            
            operation = await ai.operations.getVideosOperation({
                operation: operation,
            });
        }

        console.log(`[Veo 3.1 ${traceId}] Video generation complete!`);
        
        if (!operation.response?.generatedVideos || operation.response.generatedVideos.length === 0) {
            throw new Error("No videos were generated");
        }

        const video = operation.response.generatedVideos[0];
        if (!video.video?.uri) {
            throw new Error("Generated video has no URI");
        }

        // Download the video server-side to avoid exposing API key to client
        console.log(`[Veo 3.1 ${traceId}] Downloading video server-side...`);
        const videoUri = `${video.video.uri}&key=${apiKey}`;
        const response = await fetch(videoUri);
        
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status}`);
        }
        
        const videoBuffer = await response.arrayBuffer();
        const base64Video = Buffer.from(videoBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'video/mp4';
        
        console.log(`[Veo 3.1 ${traceId}] Video downloaded and encoded, size:`, Math.round(videoBuffer.byteLength / 1024), "KB");
        
        // Return as data URL (like we do for images)
        return `data:${mimeType};base64,${base64Video}`;
    } catch (error: any) {
        const traceId = config.traceId || 'no-trace';
        console.error(`[Veo 3.1 ${traceId}] Video API Error:`, error);
        throw new Error(error.message || "Failed to generate video");
    }
}
