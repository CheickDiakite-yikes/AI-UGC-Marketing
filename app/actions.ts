'use server';

import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    // This will log on the server check, useful for debugging deployment
    console.warn("Server Warning: GEMINI_API_KEY is not set.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });

export async function generateContentServer(model: string, contents: any, config: any) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

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
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");
    // Image generation might have different response structure
    // For now, implement a basic passthrough using the same generic method or specific if SDK differs
    // The GoogleGenAI SDK V2 usually uses generateContent for images too if using Multimodal, 
    // but the `gemini-3-pro-image-preview` might separate it.
    // Let's stick to the generic one for now unless we know the specific SDK method for image gen is different.
    // Based on previous `geminiService.ts`: `ai.models.generateContent` with `imageConfig`.

    return generateContentServer(model, { parts: [{ text: prompt }] }, config);
}
