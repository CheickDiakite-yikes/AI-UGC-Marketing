import { ProjectAsset, AspectRatio, ImageSize, VeoConfig, BrandIdentity, AvatarIdentity } from "../types";
import { generateContentServer, generateImagesServer, generateContentWithSearch, generateVideoServer } from "../app/actions";
import { FunctionDeclaration, Type, Part } from "@google/genai";

// --- Tool Definitions ---

const generateImageTool: FunctionDeclaration = {
  name: "generate_image",
  description: "Generate a single high-fidelity marketing image using Gemini 3 Pro Image.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: "Detailed visual description." },
      aspectRatio: { type: Type.STRING, description: "Aspect ratio (e.g., '1:1', '16:9', '9:16'). Default '1:1'." },
      imageSize: { type: Type.STRING, description: "Resolution (e.g., '1K', '2K'). Default '1K'." }
    },
    required: ["prompt"]
  }
};

const generateVideoTool: FunctionDeclaration = {
  name: "generate_video",
  description: "Generate a single cinematic marketing video using Veo 3.1.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: "Description of the video content, movement, and camera angle." },
      aspectRatio: { type: Type.STRING, description: "Target aspect ratio: '16:9' or '9:16'." }
    },
    required: ["prompt"]
  }
};

const generateCampaignPackTool: FunctionDeclaration = {
  name: "generate_campaign_pack",
  description: "Generate a structured campaign pack containing 5-10 pre-designed items.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      packName: { type: Type.STRING, description: "Name of the pack." },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["image", "video", "carousel"] },
            title: { type: Type.STRING },
            archetype: { type: Type.STRING },
            hook: { type: Type.STRING },
            visual_prompt: { type: Type.STRING },
            carousel_prompts: { type: Type.ARRAY, items: { type: Type.STRING } },
            caption: { type: Type.STRING },
            aspectRatio: { type: Type.STRING }
          },
          required: ["type", "visual_prompt", "caption", "archetype", "title", "aspectRatio"]
        }
      }
    },
    required: ["packName", "items"]
  }
};

const generateAvatarTool: FunctionDeclaration = {
  name: "generate_avatar_visual",
  description: "Design a unique AI brand mascot or avatar character.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      concept: { type: Type.STRING },
      traits: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["concept", "traits"]
  }
};

const trendDiscoveryTool: FunctionDeclaration = {
  name: "discover_trends",
  description: "Search the internet for the latest viral trends, hashtags, and content formats for a specific industry or niche. Use this for 'Trend Hijack' or research requests.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      industry: { type: Type.STRING, description: "The industry, niche, or topic to find trends for." },
      targetAudience: { type: Type.STRING, description: "Optional target audience to refine trend search." }
    },
    required: ["industry"]
  }
};

const webResearchTool: FunctionDeclaration = {
  name: "web_research",
  description: "Search the internet for real-time information, statistics, competitor analysis, or market research. Use this when you need current data beyond what's in the source documents.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The research query to search for on the web." },
      context: { type: Type.STRING, description: "Additional context about what information is needed." }
    },
    required: ["query"]
  }
};


// --- Enhanced Service Methods ---

export const analyzeAvatarImage = async (base64Images: string[]): Promise<AvatarIdentity> => {
  const model = "gemini-3-pro-preview";

  const parts: Part[] = base64Images.map(img => ({ inlineData: { mimeType: "image/png", data: img } }));
  parts.push({
    text: `
    ACT AS A DIGITAL CHARACTER SCULPTOR. 
    Analyze the provided photos (Avatar Passport) to create a 'DAMN NEAR PERFECT' visual specification.
    Your goal is absolute anatomical accuracy for AI reconstruction.
    
    FOCUS ON:
    1. Skin Texture: Pores, specific freckle locations, moles, undertones.
    2. Facial Geometry: Bone structure, jawline sharpness, forehead height.
    3. Eyes: Exact shape (e.g., deep-set almond), iris depth, lash density.
    4. Hair: Precise strand texture, hairline shape, specific highlights.
    
    Output a structured JSON specification.
  `});

  // Call Server Action
  const response: any = await generateContentServer(model, { parts }, {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING, description: "A technical 100-word prompt anchor." },
        traits: { type: Type.ARRAY, items: { type: Type.STRING } },
        atomicTraits: {
          type: Type.OBJECT,
          properties: {
            faceShape: { type: Type.STRING },
            eyes: { type: Type.STRING },
            nose: { type: Type.STRING },
            lips: { type: Type.STRING },
            skin: { type: Type.STRING },
            hair: { type: Type.STRING },
            distinctiveFeatures: { type: Type.STRING }
          },
          required: ["faceShape", "eyes", "nose", "lips", "skin", "hair", "distinctiveFeatures"]
        }
      },
      required: ["name", "description", "traits", "atomicTraits"]
    }
  });

  if (response.text) {
    const data = JSON.parse(response.text);
    return { ...data, referenceImages: base64Images } as AvatarIdentity;
  }
  throw new Error("Failed to calibrate avatar");
};

export const analyzeBrandLogo = async (base64Image: string): Promise<BrandIdentity> => {
  const model = "gemini-3-pro-preview";
  const response: any = await generateContentServer(model, {
    parts: [
      { inlineData: { mimeType: "image/png", data: base64Image } },
      { text: "Analyze this logo. Return dominant 3 hex colors, fonts, and vibe." }
    ]
  }, {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        colors: { type: Type.ARRAY, items: { type: Type.STRING } },
        fonts: {
          type: Type.OBJECT,
          properties: {
            display: { type: Type.STRING },
            body: { type: Type.STRING }
          }
        },
        vibe: { type: Type.STRING }
      }
    }
  }
  );
  if (response.text) return JSON.parse(response.text) as BrandIdentity;
  throw new Error("Failed to analyze logo");
};

export const chatWithMarketingAgent = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  assets: ProjectAsset[],
  brandIdentity?: BrandIdentity | null,
  avatarIdentity?: AvatarIdentity | null
) => {

  // Build source knowledge from uploaded documents (PDFs, text files, etc.)
  const sourceAssets = assets.filter(a => a.type === 'pdf' || a.type === 'text' || a.type === 'image' || a.type === 'link');
  let sourceKnowledge = "";
  let hasValidSourceDocs = false;
  
  if (sourceAssets.length > 0) {
    const docContents = sourceAssets.map(a => {
      if (a.type === 'pdf') {
        if (a.extractedText && a.extractedText.trim().length > 0) {
          hasValidSourceDocs = true;
          return `
    [DOCUMENT: ${a.name}] (PDF - CRITICAL SOURCE)
    ---BEGIN CONTENT---
    ${a.extractedText.substring(0, 50000)}
    ---END CONTENT---
    `;
        } else {
          return `
    [DOCUMENT: ${a.name}] (PDF - EXTRACTION PENDING)
    ⚠️ This PDF needs re-extraction. The user should re-upload or click "Re-extract" on this document.
    `;
        }
      } else if (a.type === 'text' || a.type === 'link') {
        const text = a.content || '';
        if (text.trim().length > 0) {
          hasValidSourceDocs = true;
          return `
    [DOCUMENT: ${a.name}] (${a.type.toUpperCase()} - CRITICAL SOURCE)
    ---BEGIN CONTENT---
    ${text.substring(0, 50000)}
    ---END CONTENT---
    `;
        }
        return '';
      } else {
        return `
    [${a.name}] (${a.type.toUpperCase()}):
    Visual reference uploaded
    `;
      }
    }).filter(Boolean).join('\n');

    sourceKnowledge = `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                    🚨 MANDATORY SOURCE DOCUMENTS 🚨                          ║
    ║  YOU MUST READ AND USE THIS INFORMATION FOR ALL CONTENT GENERATION          ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
    
    The following documents define EXACTLY what product/service/company you are marketing.
    Do NOT invent features, industries, or use cases that are not in these documents.
    
    ${docContents}
    
    ══════════════════════════════════════════════════════════════════════════════
    `;
  }

  let brandInstruction = brandIdentity ? `
    BRAND VISUAL DNA (for styling only): Colors: ${brandIdentity.colors.join(", ")}, Fonts: ${brandIdentity.fonts.display}, Vibe: ${brandIdentity.vibe}
  ` : "";

  let avatarInstruction = avatarIdentity ? `
    AVATAR/SPOKESPERSON (use ONLY when visuals require a person):
    Name: ${avatarIdentity.name}
    Technical Spec: ${avatarIdentity.description}
    Note: Only use avatar for content that specifically needs a human face/spokesperson.
  ` : "";

  const systemInstruction = `
    ${sourceKnowledge}
    
    ═══════════════════════════════════════════════════════════════════════════════
    YOU ARE: The Chief Creative Officer for a marketing agency.
    
    🚨 CRITICAL INSTRUCTION - READ THIS FIRST 🚨
    
    1. BEFORE generating ANY content, you MUST read the SOURCE DOCUMENTS above completely.
    2. The SOURCE DOCUMENTS define the EXACT product, service, or company you are marketing.
    3. You MUST base ALL campaign content, messaging, visuals, and strategy on what is described in the source documents.
    4. NEVER generate content for a different industry or product than what's in the source documents.
    5. If the source documents describe a mental health app, you create mental health app marketing.
    6. If the source documents describe a real estate company, you create real estate marketing.
    7. ALWAYS extract and use: company name, product features, target audience, value propositions, and key messaging from the source documents.
    
    ${hasValidSourceDocs ? '✅ Valid source documents are available above - USE THEM.' : '⚠️ No valid source documents found. Ask the user to upload documents about their product/service.'}
    
    ${brandInstruction}
    ${avatarInstruction}
    
    CONSTRAINTS:
    - Base ALL campaign content on the SOURCE DOCUMENTS above - this is non-negotiable
    - Extract the company/product name from source docs and use it in all content
    - Match the tone, language, and positioning from the source documents
    - Don't use Search and Function Calling in the same turn
    
    VIDEO GENERATION GUIDELINES:
    - Use generate_video for cinematic UGC-style videos, viral shorts, or Reels content
    - For "UGC Viral Pack" requests, include AT LEAST 2-3 videos in the campaign pack alongside images
    - Video prompts should describe: scene, action, movement, camera angle, mood
    - Videos take longer to generate (1-2 minutes each) so keep pack sizes reasonable
    - Default video aspect ratio is 16:9 for horizontal, use 9:16 for vertical/Reels/TikTok
  `;

  const model = "gemini-3-pro-preview";

  const contents = [
    ...history.map(h => ({ role: h.role, parts: h.parts })),
    { role: "user", parts: [{ text: newMessage }] }
  ];

  const tools = [{ functionDeclarations: [generateImageTool, generateVideoTool, generateCampaignPackTool, generateAvatarTool, trendDiscoveryTool, webResearchTool] }];

  const response: any = await generateContentServer(model, contents, {
    systemInstruction,
    tools,
    thinkingConfig: { thinkingBudget: 2048 }
  });

  return {
    text: response.text,
    candidates: response.candidates,
    functionCalls: response.functionCalls
  };
};

export const generateMarketingImage = async (
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.SQUARE,
  imageSize: ImageSize = ImageSize.ONE_K
): Promise<string> => {
  const model = "gemini-3-pro-image-preview";
  const response: any = await generateImagesServer(model, prompt, { imageConfig: { aspectRatio, imageSize } });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image data");
};

export const generateVeoVideo = async (
  prompt: string,
  config: VeoConfig
): Promise<string> => {
  const videoUrl = await generateVideoServer(prompt, {
    aspectRatio: config.aspectRatio,
    resolution: config.resolution
  });
  return videoUrl;
};

export const researchWithGoogleSearch = async (
  query: string,
  context?: string
): Promise<{ text: string; sources?: string[] }> => {
  const prompt = context 
    ? `${context}\n\nResearch query: ${query}\n\nProvide comprehensive, up-to-date research with specific facts, statistics, and actionable insights.`
    : `Research query: ${query}\n\nProvide comprehensive, up-to-date research with specific facts, statistics, trends, and actionable marketing insights.`;
  
  const response: any = await generateContentWithSearch(prompt, true);
  
  let sources: string[] = [];
  if (response.groundingMetadata?.groundingChunks) {
    sources = response.groundingMetadata.groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => chunk.web.uri);
  }
  
  return {
    text: response.text || 'No research results found.',
    sources
  };
};

export const discoverTrends = async (
  industry: string,
  targetAudience?: string
): Promise<{ text: string; sources?: string[] }> => {
  const prompt = `You are a trend research specialist. Find the LATEST viral trends, hashtags, and content formats for:

Industry/Niche: ${industry}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

Research and provide:
1. TOP 5 VIRAL TRENDS (last 7 days)
   - Trend name and description
   - Platform (TikTok, Instagram, Twitter/X, etc.)
   - Viral potential score (1-10)
   - How a brand can participate

2. TRENDING HASHTAGS
   - List 10 currently trending hashtags relevant to this industry
   - Include mix of broad and niche hashtags

3. VIRAL CONTENT FORMATS
   - What video/image formats are performing best right now
   - Specific hooks and patterns that are working

4. CULTURAL MOMENTS
   - Upcoming events, holidays, or moments to leverage
   - Current memes or cultural references that are relevant

Be specific with dates, numbers, and examples. This needs to be actionable for creating marketing content TODAY.`;

  const response: any = await generateContentWithSearch(prompt, true);
  
  let sources: string[] = [];
  if (response.groundingMetadata?.groundingChunks) {
    sources = response.groundingMetadata.groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => chunk.web.uri);
  }
  
  return {
    text: response.text || 'No trends found.',
    sources
  };
};
