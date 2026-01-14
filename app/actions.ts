'use server';

import { GoogleGenAI } from '@google/genai';

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

export async function generateImagesServer(model: string, prompt: string, config: any) {
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured on the server.");
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
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
    config: { aspectRatio?: '16:9' | '9:16'; resolution?: '720p' | '1080p' }
): Promise<string> {
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured on the server.");
    
    try {
        console.log("[Veo 3.1] Starting video generation with prompt:", prompt.substring(0, 100) + "...");
        
        // Use veo-3.1-fast-generate-preview for faster generation ($0.15/sec vs $0.40/sec)
        let operation = await ai.models.generateVideos({
            model: "veo-3.1-fast-generate-preview",
            prompt: prompt,
            config: {
                aspectRatio: config.aspectRatio || "16:9",
            },
        });

        console.log("[Veo 3.1] Video generation started, polling for completion...");
        
        // Poll for completion (timeout after 5 minutes)
        const startTime = Date.now();
        const timeout = 5 * 60 * 1000; // 5 minutes
        
        while (!operation.done) {
            if (Date.now() - startTime > timeout) {
                throw new Error("Video generation timed out after 5 minutes");
            }
            
            console.log("[Veo 3.1] Still generating... waiting 10 seconds");
            await new Promise((resolve) => setTimeout(resolve, 10000));
            
            operation = await ai.operations.getVideosOperation({
                operation: operation,
            });
        }

        console.log("[Veo 3.1] Video generation complete!");
        
        if (!operation.response?.generatedVideos || operation.response.generatedVideos.length === 0) {
            throw new Error("No videos were generated");
        }

        const video = operation.response.generatedVideos[0];
        if (!video.video?.uri) {
            throw new Error("Generated video has no URI");
        }

        // Download the video server-side to avoid exposing API key to client
        console.log("[Veo 3.1] Downloading video server-side...");
        const videoUri = `${video.video.uri}&key=${apiKey}`;
        const response = await fetch(videoUri);
        
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status}`);
        }
        
        const videoBuffer = await response.arrayBuffer();
        const base64Video = Buffer.from(videoBuffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'video/mp4';
        
        console.log("[Veo 3.1] Video downloaded and encoded, size:", Math.round(videoBuffer.byteLength / 1024), "KB");
        
        // Return as data URL (like we do for images)
        return `data:${mimeType};base64,${base64Video}`;
    } catch (error: any) {
        console.error("Veo 3.1 Video API Error:", error);
        throw new Error(error.message || "Failed to generate video");
    }
}
