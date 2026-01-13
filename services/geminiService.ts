import { ProjectAsset, AspectRatio, ImageSize, VeoConfig, BrandIdentity, AvatarIdentity } from "../types";
import { generateContentServer, generateImagesServer } from "../app/actions";
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
  const sourceAssets = assets.filter(a => a.type === 'pdf' || a.type === 'text' || a.type === 'image');
  let sourceKnowledge = "";
  if (sourceAssets.length > 0) {
    sourceKnowledge = `
    === PRIMARY SOURCE DOCUMENTS (HIGHEST PRIORITY) ===
    Use this information as the foundation for ALL campaign content, messaging, and strategy:
    ${sourceAssets.map(a => `
    [${a.name}] (${a.type.toUpperCase()}):
    ${a.type === 'pdf' || a.type === 'text' ? (a.content ? atob(a.content).substring(0, 5000) : 'Content not available') : 'Visual reference uploaded'}
    `).join('\n')}
    ===
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
    You are the Chief Creative Officer for a marketing agency.
    
    CONTEXT PRIORITY ORDER (follow strictly):
    1. SOURCE DOCUMENTS - Primary source of truth for company info, products, services, messaging
    2. BRAND DNA - Use for visual styling (colors, fonts, vibe)
    3. AVATAR - Only use when generating content that specifically requires a human spokesperson
    
    ${sourceKnowledge}
    ${brandInstruction}
    ${avatarInstruction}
    
    CONSTRAINTS:
    - Base ALL campaign content on the SOURCE DOCUMENTS above
    - Don't use Search and Function Calling in the same turn
    - Video generation is currently unavailable - use ONLY images and carousels
  `;

  const model = "gemini-3-pro-preview";

  const contents = [
    ...history.map(h => ({ role: h.role, parts: h.parts })),
    { role: "user", parts: [{ text: newMessage }] }
  ];

  // Remove video tool to prevent errors
  const tools = [{ functionDeclarations: [generateImageTool, generateCampaignPackTool, generateAvatarTool] }];

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
  throw new Error("Video generation migration pending: Requires background job setup.");
};
