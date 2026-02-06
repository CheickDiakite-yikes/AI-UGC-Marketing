import { ProjectAsset, AspectRatio, ImageSize, VeoConfig, BrandIdentity, AvatarIdentity, Product } from "../types";
import { generateContentServer, generateImagesServer, generateContentWithSearch, generateVideoServer } from "../app/actions";
import { FunctionDeclaration, Type, Part, VideoGenerationReferenceImage } from "@google/genai";

const limitList = (items?: string[] | null, max: number = 8): string[] => {
  if (!items) return [];
  return items.filter(Boolean).slice(0, max);
};

const listToText = (items?: string[] | null, max: number = 8): string => {
  const limited = limitList(items, max);
  return limited.length > 0 ? limited.join(", ") : "None";
};

const listToLines = (items?: string[] | null, max: number = 8): string => {
  const limited = limitList(items, max);
  return limited.length > 0 ? limited.map(item => `- ${item}`).join("\n") : "- None";
};

// --- Tool Definitions ---

const generateImageTool: FunctionDeclaration = {
  name: "generate_image",
  description: "Generate a single high-fidelity marketing image using Gemini 3 Pro Image. You can include up to 14 reference images from the user's asset library.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: "Detailed visual description." },
      aspectRatio: { type: Type.STRING, description: "Aspect ratio (e.g., '1:1', '16:9', '9:16'). Default '1:1'." },
      imageSize: { type: Type.STRING, description: "Resolution (e.g., '1K', '2K'). Default '1K'." },
      productId: { type: Type.STRING, description: "Optional product ID to bind identity constraints for visuals." },
      brandAssetIds: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "Array of asset IDs from the BRAND ASSET LIBRARY to include as reference images. Select the most relevant logos, brand images, or avatars for this specific visual. Max 14 assets. If not provided, the system will auto-select up to 14 assets (logo + brand imagery + avatar when relevant)." 
      },
      title: { type: Type.STRING, description: "Short title for the asset card." },
      hook: { type: Type.STRING, description: "Hook strategy line (1 sentence max)." },
      caption: { type: Type.STRING, description: "Social caption for the asset." },
      archetype: { type: Type.STRING, description: "Creative archetype or style (optional)." }
    },
    required: ["prompt"]
  }
};

const generateVideoTool: FunctionDeclaration = {
  name: "generate_video",
  description: "Generate a single marketing video using Veo 3.1 (8-second max).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: "Describe the video content, movement, and camera angle. Must fit within 8 seconds." },
      aspectRatio: { type: Type.STRING, description: "Target aspect ratio: '16:9' or '9:16'." },
      productId: { type: Type.STRING, description: "Optional product ID to use for ingredient-based generation." },
      ingredientAssetIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional list of up to 3 asset IDs from the BRAND ASSET LIBRARY to use as reference images (ingredients). These can be product shots, avatars, logos, or generic setting/background images." },
      referenceSelections: {
        type: Type.ARRAY,
        description: "Optional ordered reference slots for Veo (max 3). Use roles: avatar, item, setting (setting can be generic backgrounds/mood references).",
        items: {
          type: Type.OBJECT,
          properties: {
            assetId: { type: Type.STRING },
            role: { type: Type.STRING }
          },
          required: ["assetId"]
        }
      },
      referenceMode: { type: Type.STRING, description: "Reference mode: manual (only selections), hybrid (fill missing), auto (AI chooses)." },
      qualityMode: { type: Type.BOOLEAN, description: "Prefer higher-fidelity video generation (slower, more expensive) with extra reference anchoring when possible." },
      title: { type: Type.STRING, description: "Short title for the asset card." },
      hook: { type: Type.STRING, description: "Hook strategy line (1 sentence max)." },
      caption: { type: Type.STRING, description: "Social caption for the asset." },
      archetype: { type: Type.STRING, description: "Creative archetype or style (optional)." }
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
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING },
                durationSeconds: { type: Type.NUMBER },
                title: { type: Type.STRING },
                camera: { type: Type.STRING },
                action: { type: Type.STRING },
                transition: { type: Type.STRING }
              },
              required: ["prompt"]
            }
          },
          continuitySpec: { type: Type.STRING },
          caption: { type: Type.STRING },
          aspectRatio: { type: Type.STRING },
          productId: { type: Type.STRING },
          ingredientAssetIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          qualityMode: { type: Type.BOOLEAN }
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
    5. Consistency Rules: Identify 5-10 "do not change" traits for perfect match.
    6. Wardrobe & styling: Clothing, accessories, camera angles, lighting notes.
    
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
        },
        consistencySpec: {
          type: Type.OBJECT,
          properties: {
            styleKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            wardrobe: { type: Type.STRING },
            accessories: { type: Type.ARRAY, items: { type: Type.STRING } },
            doNotChange: { type: Type.ARRAY, items: { type: Type.STRING } },
            cameraAngles: { type: Type.ARRAY, items: { type: Type.STRING } },
            lightingNotes: { type: Type.STRING },
            voiceGuidelines: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      },
      required: ["name", "description", "traits", "atomicTraits"]
    }
  });

  if (response.text) {
    const data = JSON.parse(response.text);
    const normalized = {
      ...data,
      traits: Array.isArray(data.traits) ? data.traits : [],
      consistencySpec: data.consistencySpec || {}
    };
    return { ...normalized, referenceImages: base64Images } as AvatarIdentity;
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

export interface AssetCatalogEntry {
  id: string;
  type: string;
  name: string;
  description?: string;
}

export const chatWithMarketingAgent = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  assets: ProjectAsset[],
  brandIdentity?: BrandIdentity | null,
  avatarIdentity?: AvatarIdentity | null,
  products?: Product[] | null,
  brandContext?: {
    companyName?: string;
    tagline?: string;
    description?: string;
    industry?: string;
    targetAudience?: string;
    missionStatement?: string;
    brandColors?: string[];
    fonts?: string[];
    brandFeel?: string[];
    keyOfferings?: string[];
    contactEmail?: string;
    foundedYear?: string;
    teamSize?: string;
  } | null,
  assetCatalog?: AssetCatalogEntry[] | null
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
    
    📸 UPLOADED BRAND ASSETS: When you call generate_image, the user's ACTUAL uploaded logo and brand images from their Company page will be automatically passed to the image generation model as visual references. The AI will incorporate the real logo and visual style from these uploads - you don't need to describe the logo in detail, just reference it naturally (e.g., "featuring the brand logo").
  ` : "";

  let companyContextInstruction = "";
  if (brandContext) {
    const contextLines: string[] = ['╔══════════════════════════════════════════════════════════════════════════════╗',
    '║                    🏢 YOUR COMPANY/BRAND INFORMATION 🏢                      ║',
    '╚══════════════════════════════════════════════════════════════════════════════╝'];
    if (brandContext.companyName) contextLines.push(`Company Name: ${brandContext.companyName}`);
    if (brandContext.tagline) contextLines.push(`Tagline: "${brandContext.tagline}"`);
    if (brandContext.description) contextLines.push(`Description: ${brandContext.description}`);
    if (brandContext.industry) contextLines.push(`Industry: ${brandContext.industry}`);
    if (brandContext.targetAudience) contextLines.push(`Target Audience: ${brandContext.targetAudience}`);
    if (brandContext.missionStatement) contextLines.push(`Mission: ${brandContext.missionStatement}`);
    if (brandContext.keyOfferings && brandContext.keyOfferings.length > 0) contextLines.push(`Key Offerings: ${brandContext.keyOfferings.join(", ")}`);
    if (brandContext.brandColors && brandContext.brandColors.length > 0) contextLines.push(`Brand Colors: ${brandContext.brandColors.join(", ")}`);
    if (brandContext.fonts && brandContext.fonts.length > 0) contextLines.push(`Fonts: ${brandContext.fonts.join(", ")}`);
    if (brandContext.brandFeel && brandContext.brandFeel.length > 0) contextLines.push(`Brand Feel/Personality: ${brandContext.brandFeel.join(", ")}`);
    if (brandContext.foundedYear) contextLines.push(`Founded: ${brandContext.foundedYear}`);
    if (brandContext.teamSize) contextLines.push(`Team Size: ${brandContext.teamSize}`);
    contextLines.push('');
    contextLines.push('🚨 CRITICAL: Use this company information for ALL content generation. DO NOT search the web for info about this company - you already have it above.');
    contextLines.push('══════════════════════════════════════════════════════════════════════════════');
    companyContextInstruction = contextLines.join('\n    ');
  }

  let avatarInstruction = avatarIdentity ? `
    AVATAR IDENTITY PACK (use ONLY when visuals require a person):
    Name: ${avatarIdentity.name || "Unspecified"}
    Visual DNA: ${avatarIdentity.description}
    Atomic Traits:
    - Face Shape: ${avatarIdentity.atomicTraits.faceShape}
    - Eyes: ${avatarIdentity.atomicTraits.eyes}
    - Nose: ${avatarIdentity.atomicTraits.nose}
    - Lips: ${avatarIdentity.atomicTraits.lips}
    - Skin: ${avatarIdentity.atomicTraits.skin}
    - Hair: ${avatarIdentity.atomicTraits.hair}
    - Distinctive Features: ${avatarIdentity.atomicTraits.distinctiveFeatures}
    Style Keywords: ${listToText(avatarIdentity.consistencySpec?.styleKeywords)}
    Wardrobe: ${avatarIdentity.consistencySpec?.wardrobe || "Unspecified"}
    Accessories: ${listToText(avatarIdentity.consistencySpec?.accessories)}
    Do Not Change:
    ${listToLines(avatarIdentity.consistencySpec?.doNotChange)}
    Camera Angles: ${listToText(avatarIdentity.consistencySpec?.cameraAngles)}
    Lighting Notes: ${avatarIdentity.consistencySpec?.lightingNotes || "Unspecified"}
    Voice Guidelines: ${listToText(avatarIdentity.consistencySpec?.voiceGuidelines)}
    
    👤 UPLOADED AVATAR IMAGE: When you call generate_image with prompts that mention people (person, woman, man, spokesperson, creator, founder, influencer, etc.), the user's ACTUAL uploaded avatar/spokesperson image will be automatically passed to the image generation model. The AI will use this real reference photo to maintain visual consistency of the person across all generated images. Just reference the avatar naturally in your prompts - the real image will be included automatically.
    
    Note: Only use avatar for content that specifically needs a human face/spokesperson.
  ` : "";

  let productInstruction = "";
  if (products && products.length > 0) {
    const productDetails = products.map(product => {
      const assetLines = product.assets && product.assets.length > 0
        ? product.assets.map(asset => `- ${asset.assetId} (${asset.role}${asset.isPrimary ? ", primary" : ""}${asset.variant ? `, variant: ${asset.variant}` : ""})`).join("\n")
        : "None";
      const featureText = product.keyFeatures && product.keyFeatures.length > 0 ? product.keyFeatures.join(", ") : "None";
      const variantText = product.variants && product.variants.length > 0 ? product.variants.join(", ") : "None";
      const visualSpec = product.visualSpec || {};
      const copySpec = product.copySpec || {};
      return `
    [PRODUCT ${product.id}]
    Name: ${product.name}
    Type: ${product.productType}
    Category: ${product.category || "Unspecified"}
    Platforms: ${product.platforms && product.platforms.length > 0 ? product.platforms.join(", ") : "Unspecified"}
    Digital Subtype: ${product.digitalSubtype || "Unspecified"}
    Description: ${product.description || "None"}
    Key Features: ${featureText}
    Variants: ${variantText}
    Compliance Notes: ${product.complianceNotes || "None"}
    Visual Spec:
    - Dominant Colors: ${listToText(visualSpec.dominantColors)}
    - Materials: ${listToText(visualSpec.materials)}
    - Form Factor: ${visualSpec.formFactor || "Unspecified"}
    - Packaging Geometry: ${visualSpec.packagingGeometry || "Unspecified"}
    - Label Text: ${listToText(visualSpec.labelText, 12)}
    - Logo Placement: ${visualSpec.logoPlacement || "Unspecified"}
    - Distinctive Markers: ${listToText(visualSpec.distinctiveMarkers)}
    - Usage Contexts: ${listToText(visualSpec.usageContexts)}
    - Do Not Change:
    ${listToLines(visualSpec.doNotChange)}
    Copy Spec:
    - Canonical Name: ${copySpec.canonicalName || "Unspecified"}
    - Tagline: ${copySpec.tagline || "Unspecified"}
    - Allowed Claims: ${listToText(copySpec.allowedClaims)}
    - Disallowed Claims: ${listToText(copySpec.disallowedClaims)}
    - Proof Points: ${listToText(copySpec.proofPoints)}
    - Tone Directives: ${listToText(copySpec.toneDirectives)}
    - Required Phrases: ${listToText(copySpec.requiredPhrases)}
    Assets:
    ${assetLines}
    `;
    }).join("\n");

    productInstruction = `
    PRODUCT CATALOG (use this for product-specific visuals and messaging):
    ${productDetails}

    PRODUCT INSTRUCTIONS:
    - If the user mentions a product or requests visuals, select the correct product.
    - If multiple products exist and the user did not specify, ask a clarifying question before generating.
    - For video generation, include ingredientAssetIds (max 3) or productId when product assets are available.
    - If reference roles are known, include referenceSelections (roles: avatar, item, setting) and set referenceMode to manual or hybrid.
    - For image generation, include productId when the visual is product-specific.
    - Do not invent product claims beyond the Product Catalog and Source Documents.
    - Enforce Copy Spec: use canonical names, approved claims, and required phrases; avoid disallowed claims.
    - Enforce Visual Spec: do not alter brand colors, packaging geometry, logo placement, or distinctive markers.
    `;
  } else {
    productInstruction = `
    NO PRODUCTS FOUND:
    - If the user requests product-specific visuals, ask them to add a product first.
    `;
  }

  const systemInstruction = `
    ${companyContextInstruction}
    
    ${sourceKnowledge}
    
    ═══════════════════════════════════════════════════════════════════════════════
    YOU ARE: The Chief Creative Officer for a marketing agency.
    
    🚨 CRITICAL INSTRUCTION - READ THIS FIRST 🚨
    
    1. BEFORE generating ANY content, you MUST read the COMPANY INFORMATION and SOURCE DOCUMENTS above completely.
    2. The COMPANY INFORMATION and SOURCE DOCUMENTS define the EXACT product, service, or company you are marketing.
    3. You MUST base ALL campaign content, messaging, visuals, and strategy on what is described in the company info and source documents.
    4. NEVER generate content for a different industry or product than what's in the company info or source documents.
    5. If the company is a marketing automation platform, you create marketing automation content.
    6. If the company is a real estate company, you create real estate marketing.
    7. ALWAYS use: company name, product features, target audience, value propositions, and key messaging from the COMPANY INFORMATION section.
    8. DO NOT search the web for information about the user's own company - you already have that information above.
    
    ${hasValidSourceDocs ? '✅ Valid source documents are available above - USE THEM.' : (companyContextInstruction ? '✅ Company information is available above - USE IT.' : '⚠️ No company info found. Ask the user to set up their brand in the Company page.')}
    
    ${brandInstruction}
    ${avatarInstruction}
    ${productInstruction}
    
    ${assetCatalog && assetCatalog.length > 0 ? `
    ════════════════════════════════════════════════════════════════════════════
    📁 BRAND ASSET LIBRARY (${assetCatalog.length} assets available)
    ════════════════════════════════════════════════════════════════════════════
    
    When calling generate_image, select specific assets by ID using brandAssetIds.
    When calling generate_video, select up to 3 assets by ID using ingredientAssetIds and (when roles are clear) referenceSelections with roles avatar/item/setting.
    Choose the most relevant assets for each visual - don't include everything, just what's needed.
    
    Available Assets:
${assetCatalog.slice(0, 50).map(a => `    - [${a.type.toUpperCase()}] ${a.id}: "${a.name}"${a.description ? ` - ${a.description}` : ''}`).join('\n')}
${assetCatalog.length > 50 ? `\n    ... and ${assetCatalog.length - 50} more assets` : ''}
    
    ASSET SELECTION GUIDELINES:
    - For brand consistency: Include at least one logo asset
    - For images with people: Include relevant avatar assets  
    - For product shots: Include product-specific brand images
    - For style matching: Include brand images that match the desired aesthetic
    - For lifestyle or non-product scenes: include a generic setting/background image (role: setting)
    - Brand images can include UI screenshots or product screens; use those when the request mentions software, app, UI, or website visuals
    - Max 14 reference images per generation
    - If you don't specify brandAssetIds, the system will auto-select up to 14 assets (logo + brand imagery + avatar if relevant)
    - For video references: use ingredientAssetIds (max 3) to force real image-based video generation whenever assets exist (product, avatar, or setting)
    - If the prompt mentions a logo/brand mark/watermark, include a logo asset in ingredientAssetIds (and role=item if using referenceSelections)
    ════════════════════════════════════════════════════════════════════════════
    ` : ''}
    
    CONSTRAINTS:
    - Base ALL campaign content on the SOURCE DOCUMENTS above - this is non-negotiable
    - Extract the company/product name from source docs and use it in all content
    - Match the tone, language, and positioning from the source documents
    - Don't use Search and Function Calling in the same turn
    - Keep product and avatar identity consistent across ALL assets and copy
    - For single generate_image or generate_video requests, include title, hook, and caption in the tool call arguments
    - After calling generate_image or generate_video, provide the hook strategy and caption in your text response

    VIDEO GENERATION GUIDELINES:
    - Long video generation is retired. Do not call generate_long_video and do not include long_video items in campaign packs.
    - Use generate_video for cinematic UGC-style videos, viral shorts, or Reels content
    - Only ask follow-up questions if critical info is missing (no product context, compliance risk, or unclear platform)
    - For "UGC Viral Pack" requests, include AT LEAST 2-3 videos in the campaign pack alongside images
    - Video prompts should describe: scene, action, movement, camera angle, mood
    - Avoid on-screen text unless the user explicitly asks for it
    - Max duration is 8 seconds; design the primary action to finish by 7s and end on a complete beat
    - Keep pacing tight: hook in the first 1s, payoff by 6s, single scene or two quick cuts max
    - On-screen text must be short (1-3 words) to avoid misspellings or cut-off overlays
    - Avoid morphing, extra limbs, or identity shifts; describe stable anatomy and clear hand-object contact
    - For taps, button presses, or phone use: specify realistic contact, finger alignment, and device response
    - Videos take longer to generate (1-2 minutes each) so keep pack sizes reasonable
    - Default video aspect ratio is 16:9 for horizontal, use 9:16 for vertical/Reels/TikTok
    - Ingredient-based video generation is most reliable in 16:9 and 8s duration; for vertical, enable qualityMode and expect possible fallback
    - When possible, use referenceSelections with roles (avatar, item, setting) to lock identity and props; set referenceMode: hybrid to fill missing
    - Prefer real visual references for videos whenever assets exist (ingredientAssetIds or referenceSelections). Only use text-only videos if no assets are available.
    - If the request is generic or lifestyle (no specific product), use a setting reference (generic background/mood image) instead of forcing a product shot
    - If a logo appears in the video, include a logo asset reference (ingredientAssetIds) to keep it accurate and avoid stylized redraws
    - Set qualityMode: true for UGC/influencer videos, close-up hands, product interactions, or when the user asks for the best realism
    - Use 1080p only when quality benefits are required and prompts are stable; otherwise stick to 720p for speed
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

export interface BrandAssetReference {
  mimeType: string;
  base64: string;
  role?: 'logo' | 'brand_image' | 'avatar';
}

export const generateMarketingImage = async (
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.SQUARE,
  imageSize: ImageSize = ImageSize.ONE_K,
  brandAssets?: BrandAssetReference[]
): Promise<string> => {
  const model = "gemini-3-pro-image-preview";
  const response: any = await generateImagesServer(
    model, 
    prompt, 
    { imageConfig: { aspectRatio, imageSize } },
    brandAssets
  );

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image data");
};

export const generateReferenceImage = async (
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.LANDSCAPE
): Promise<{ base64: string; mimeType: string }> => {
  const model = "gemini-3-pro-image-preview";
  const response: any = await generateImagesServer(model, prompt, { imageConfig: { aspectRatio } });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png"
      };
    }
  }
  throw new Error("No reference image data");
};

export const generateVeoVideo = async (
  prompt: string,
  config: VeoConfig,
  options?: { referenceImages?: VideoGenerationReferenceImage[]; initialFrame?: { imageBytes: string; mimeType: string }; traceId?: string }
): Promise<string> => {
  const videoUrl = await generateVideoServer(prompt, {
    aspectRatio: config.aspectRatio,
    resolution: config.resolution,
    durationSeconds: config.durationSeconds,
    qualityMode: config.qualityMode,
    referenceImages: options?.referenceImages,
    image: options?.initialFrame,
    traceId: options?.traceId
  });
  return videoUrl;
};

export const researchWithGoogleSearch = async (
  query: string,
  context?: string
): Promise<{ text: string; sources?: string[] }> => {
  const ideaInstruction = `
After the research, add a section titled "IDEA OPTIONS" with 3-5 campaign ideas.
Format each idea as:
1) <Title> - <one-sentence plan>
Keep each idea under 140 characters.
`;
  const prompt = context 
    ? `${context}\n\nResearch query: ${query}\n\nProvide comprehensive, up-to-date research with specific facts, statistics, and actionable insights.\n${ideaInstruction}`
    : `Research query: ${query}\n\nProvide comprehensive, up-to-date research with specific facts, statistics, trends, and actionable marketing insights.\n${ideaInstruction}`;
  
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
  const ideaInstruction = `
After the research, add a section titled "IDEA OPTIONS" with 3-5 campaign ideas.
Format each idea as:
1) <Title> - <one-sentence plan>
Keep each idea under 140 characters.
`;
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

Be specific with dates, numbers, and examples. This needs to be actionable for creating marketing content TODAY.
${ideaInstruction}`;

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

export const validateCopyConsistency = async (
  copy: { title?: string; hook?: string; caption?: string },
  context: {
    brandIdentity?: BrandIdentity | null;
    avatarIdentity?: AvatarIdentity | null;
    products?: Product[] | null;
    productId?: string | null;
    traceId?: string;
  }
): Promise<{ title?: string; hook?: string; caption?: string; issues: string[]; changed: boolean }> => {
  const traceId = context.traceId || 'no-trace';
  const productList = context.products || [];
  let selectedProduct: Product | undefined;

  if (context.productId) {
    selectedProduct = productList.find(product => product.id === context.productId) || undefined;
  } else if (productList.length === 1) {
    selectedProduct = productList[0];
  }

  const visualSpec = selectedProduct?.visualSpec || {};
  const copySpec = selectedProduct?.copySpec || {};

  const prompt = `
You are a copy consistency validator for marketing content.
Check the provided copy against the Product Identity Pack and Brand DNA.
If any inconsistencies exist, rewrite the copy to comply while keeping tone and length similar.

PRODUCT CONTEXT:
Name: ${selectedProduct?.name || 'Unspecified'}
Type: ${selectedProduct?.productType || 'Unspecified'}
Description: ${selectedProduct?.description || 'None'}
Key Features: ${selectedProduct?.keyFeatures?.join(', ') || 'None'}
Compliance Notes: ${selectedProduct?.complianceNotes || 'None'}
Copy Spec:
- Canonical Name: ${copySpec.canonicalName || 'Unspecified'}
- Tagline: ${copySpec.tagline || 'Unspecified'}
- Allowed Claims: ${copySpec.allowedClaims?.join(', ') || 'None'}
- Disallowed Claims: ${copySpec.disallowedClaims?.join(', ') || 'None'}
- Proof Points: ${copySpec.proofPoints?.join(', ') || 'None'}
- Tone Directives: ${copySpec.toneDirectives?.join(', ') || 'None'}
- Required Phrases: ${copySpec.requiredPhrases?.join(', ') || 'None'}

BRAND DNA:
Colors: ${context.brandIdentity?.colors?.join(', ') || 'Unspecified'}
Vibe: ${context.brandIdentity?.vibe || 'Unspecified'}

COPY TO VALIDATE:
Title: ${copy.title || ''}
Hook: ${copy.hook || ''}
Caption: ${copy.caption || ''}

Rules:
- Use canonical product name if provided.
- Only include claims that are in Allowed Claims or Key Features.
- Do NOT include Disallowed Claims or anything conflicting with Compliance Notes.
- Preserve tone directives if provided.
- Insert required phrases naturally when possible.
- Return corrected copy and list of issues.
`;

  console.log(`[COPY VALIDATOR ${traceId}] Running copy consistency check`);

  const response: any = await generateContentServer('gemini-2.5-flash', [{ role: 'user', parts: [{ text: prompt }] }], {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        hook: { type: Type.STRING },
        caption: { type: Type.STRING },
        issues: { type: Type.ARRAY, items: { type: Type.STRING } },
        changed: { type: Type.BOOLEAN }
      },
      required: ['issues', 'changed']
    }
  });

  if (!response.text) {
    return { ...copy, issues: ['Validator returned empty response'], changed: false };
  }

  const parsed = JSON.parse(response.text);
  return {
    title: parsed.title || copy.title,
    hook: parsed.hook || copy.hook,
    caption: parsed.caption || copy.caption,
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    changed: !!parsed.changed
  };
};
