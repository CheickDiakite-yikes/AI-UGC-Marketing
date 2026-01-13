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

  let brandInstruction = brandIdentity ? `
    BRAND DNA: Colors: ${brandIdentity.colors.join(", ")}, Fonts: ${brandIdentity.fonts.display}, Vibe: ${brandIdentity.vibe}
  ` : "";

  let avatarInstruction = avatarIdentity ? `
    AVATAR SPOKESPERSON (HIGH-FIDELITY ANCHOR):
    Name: ${avatarIdentity.name}
    Technical Spec: ${avatarIdentity.description}
    Anatomy: ${JSON.stringify(avatarIdentity.atomicTraits)}
    CRITICAL: For every visual generation involving this character, use the "Technical Spec" and "Anatomy" to ensure 100% idiosyncratic consistency. No generic humans allowed.
  ` : "";

  const systemInstruction = `
    You are the Chief Creative Officer. Use the provided Brand DNA and Avatar Anchor for all creative work.
    Constraints: Don't use Search and Function Calling in the same turn.
    Tools: googleSearch (Research), functionDeclarations (Creation).
    IMPORTANT: Video generation is currently unavailable. For campaign packs, use ONLY images and carousels (no videos).
  ` + brandInstruction + avatarInstruction;

  const model = "gemini-3-pro-preview";

  const contents = [
    ...history.map(h => ({ role: h.role, parts: h.parts })),
    { role: "user", parts: [{ text: newMessage }] }
  ];

  const tools = [{ functionDeclarations: [generateImageTool, generateVideoTool, generateCampaignPackTool, generateAvatarTool] }];

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
