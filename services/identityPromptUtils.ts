import type { AvatarIdentity, BrandIdentity, Product } from '@/types';

const limitList = (items?: string[] | null, max: number = 8): string[] => {
  if (!items) return [];
  return items.filter(Boolean).slice(0, max);
};

const listToText = (items?: string[] | null, max: number = 8): string => {
  const limited = limitList(items, max);
  return limited.length > 0 ? limited.join(', ') : 'None';
};

const listToLines = (items?: string[] | null, max: number = 8): string => {
  const limited = limitList(items, max);
  return limited.length > 0 ? limited.map(item => `- ${item}`).join('\n') : '- None';
};

export const shouldUseAvatar = (prompt: string): boolean => {
  const text = prompt.toLowerCase();
  const blockAvatar = /no (people|person|faces|human|avatar|model)/.test(text) || /product\s*only/.test(text);
  if (blockAvatar) return false;
  return /(person|woman|man|people|face|spokesperson|model|creator|founder|influencer|ugc|character|girl|boy|dad|mom|mother|father|kid|child|teen|adult)/.test(text);
};

const buildBrandBlock = (brand?: BrandIdentity | null): string | null => {
  if (!brand) return null;
  return `BRAND VISUAL DNA: Colors: ${brand.colors.join(', ')}, Fonts: ${brand.fonts.display}, Vibe: ${brand.vibe}`;
};

const buildAvatarBlock = (avatar?: AvatarIdentity | null): string | null => {
  if (!avatar) return null;
  return [
    `AVATAR CONSISTENCY (only if a person appears):`,
    `Name: ${avatar.name || 'Unspecified'}`,
    `Visual DNA: ${avatar.description}`,
    `Do Not Change:`,
    listToLines(avatar.consistencySpec?.doNotChange),
    `Style Keywords: ${listToText(avatar.consistencySpec?.styleKeywords)}`,
    `Wardrobe: ${avatar.consistencySpec?.wardrobe || 'Unspecified'}`,
    `Accessories: ${listToText(avatar.consistencySpec?.accessories)}`
  ].join('\n');
};

const buildProductBlock = (product: Product): string => {
  const visualSpec = product.visualSpec || {};
  return [
    `PRODUCT VISUAL IDENTITY:`,
    `Name: ${product.name}`,
    `Type: ${product.productType}`,
    `Dominant Colors: ${listToText(visualSpec.dominantColors)}`,
    `Materials: ${listToText(visualSpec.materials)}`,
    `Form Factor: ${visualSpec.formFactor || 'Unspecified'}`,
    `Packaging Geometry: ${visualSpec.packagingGeometry || 'Unspecified'}`,
    `Label Text (exact): ${listToText(visualSpec.labelText, 12)}`,
    `Logo Placement: ${visualSpec.logoPlacement || 'Unspecified'}`,
    `Distinctive Markers: ${listToText(visualSpec.distinctiveMarkers)}`,
    `Do Not Change:`,
    listToLines(visualSpec.doNotChange)
  ].join('\n');
};

export function buildIdentityConstraints(params: {
  basePrompt: string;
  brandIdentity?: BrandIdentity | null;
  avatarIdentity?: AvatarIdentity | null;
  products?: Product[] | null;
  productId?: string | null;
}): { prompt: string; productIdUsed?: string; notes: string[] } {
  const { basePrompt, brandIdentity, avatarIdentity, products, productId } = params;
  const notes: string[] = [];

  let selectedProduct: Product | undefined;
  if (productId) {
    selectedProduct = products?.find(product => product.id === productId);
    if (!selectedProduct) {
      notes.push('Requested productId not found in identity constraints');
    }
  } else if (products && products.length === 1) {
    selectedProduct = products[0];
  }

  const blocks: string[] = [];
  const brandBlock = buildBrandBlock(brandIdentity);
  if (brandBlock) blocks.push(brandBlock);

  if (selectedProduct) {
    blocks.push(buildProductBlock(selectedProduct));
  }

  if (avatarIdentity && shouldUseAvatar(basePrompt)) {
    const avatarBlock = buildAvatarBlock(avatarIdentity);
    if (avatarBlock) blocks.push(avatarBlock);
  }

  if (blocks.length === 0) {
    return { prompt: basePrompt, notes };
  }

  return {
    prompt: `${basePrompt}\n\n[IDENTITY CONSTRAINTS]\n${blocks.join('\n\n')}`,
    productIdUsed: selectedProduct?.id,
    notes
  };
}
