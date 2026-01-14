
export interface ProjectAsset {
  id: string;
  type: 'logo' | 'image' | 'pdf' | 'text' | 'link' | 'avatar';
  name: string;
  content: string; // Base64, Text, or URL from object storage
  storageKey?: string | null; // Object storage key for media files
  mimeType?: string;
  status?: 'digesting' | 'ready';
  extractedText?: string; // For PDFs: extracted readable text content
  metadata?: AssetMetadata;
}

export interface CanvasItem {
  id: string;
  type: 'text' | 'image' | 'video' | 'carousel';
  content: string; // Text content or Base64/URL for media (Cover image for carousel)
  carouselUrls?: string[]; // For carousel items
  title: string;
  description?: string;
  meta?: {
    aspectRatio?: string;
    resolution?: string;
    modelUsed?: string;
    caption?: string; // Social media caption
    archetype?: string; // Creative style
    hook?: string; // Marketing hook
  };
  x?: number; // For future drag/drop
  y?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isThinking?: boolean;
  relatedCanvasItems?: string[]; // IDs of items generated in this turn
  groundingLinks?: { title: string; url: string }[];
  isResearchResult?: boolean; // True when AI did research and awaiting user decision
  researchDismissed?: boolean; // True when user dismissed the research
}

export interface BrandIdentity {
  colors: string[];
  fonts: {
    display: string;
    body: string;
    vibe?: string; // Made optional to support legacy
  };
  vibe: string;
}

export interface AvatarIdentity {
  description: string;
  traits: string[]; // High-level tags
  atomicTraits: {
    faceShape: string;
    eyes: string;
    nose: string;
    lips: string;
    skin: string;
    hair: string;
    distinctiveFeatures: string; // Freckles, scars, specific moles
  };
  name?: string;
  referenceImages: string[]; // Array of base64 shots (Front, Side, etc)
}

export interface Board {
  id: string;
  name: string;
  assets: ProjectAsset[];
  items: CanvasItem[];
  messages: ChatMessage[];
  brandIdentity: BrandIdentity | null;
  avatarIdentity: AvatarIdentity | null;
  products?: Product[];
  createdAt: number;
}

export interface UsageStats {
  imagesGenerated: number;
  videosGenerated: number;
  lastResetDate: number; // timestamp
}

export type ProductType = 'physical_product' | 'software' | 'service' | 'digital_product' | 'hardware';

export type ProductAssetRole =
  | 'product_shot'
  | 'packaging'
  | 'mockup'
  | 'screenshot'
  | 'in_use'
  | 'lifestyle'
  | 'hero'
  | 'logo'
  | 'ui'
  | 'other';

export interface Product {
  id: string;
  boardId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  productType: ProductType;
  platforms?: string[] | null;
  digitalSubtype?: string | null;
  keyFeatures?: string[] | null;
  variants?: string[] | null;
  complianceNotes?: string | null;
  assets?: ProductAsset[];
  createdAt?: number;
}

export interface ProductAsset {
  id: string;
  productId: string;
  assetId: string;
  role: ProductAssetRole;
  isPrimary?: boolean | null;
  variant?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  createdAt?: number;
}

export interface AssetAutoTags {
  isProductAsset: boolean;
  productNameGuess?: string | null;
  productType?: ProductType | null;
  role?: ProductAssetRole | null;
  variant?: string | null;
  confidence?: number | null;
  matchedProductId?: string | null;
  matchConfidence?: number | null;
  notes?: string | null;
}

export interface AssetMetadata {
  autoTags?: AssetAutoTags;
}

export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT = "9:16",
  LANDSCAPE = "16:9",
  STANDARD = "4:3",
  WIDE = "21:9"
}

export enum ImageSize {
  ONE_K = "1K",
  TWO_K = "2K",
  FOUR_K = "4K"
}

export interface VeoConfig {
  resolution: '720p' | '1080p';
  aspectRatio: '16:9' | '9:16';
  durationSeconds?: 4 | 6 | 8;
}
