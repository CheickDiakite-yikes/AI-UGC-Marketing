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
        // We need to serialize the response to send it back to the client
        // The raw response might contain non-serializable objects (like functions), so we extract what we need.
        // However, usually response.text or simple objects are fine.
        // Let's assume the client needs the text or simple data.
        // For now, let's return the simplified response structure usually expected.

        // Note: The GoogleGenAI SDK response might have methods. We should return a plain object.
        const text = response.text;
        // We can also return the full candidates if needed, but we need to ensure it's plain JSON.
        return {
            text,
            candidates: response.candidates,
            // Add other fields if necessary
        };

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        throw new Error(error.message || "Failed to generate content");
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
