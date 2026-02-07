'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { profileAssets, profileProductAssets, profileProducts, users } from '@/db/schema';
import { getSession } from './authActions';
import { uploadProfileAsset, deleteAsset as deleteFromStorage } from '@/services/objectStorageService';
import { ProfileLibrary, ProfileAsset, ProfileProduct } from '@/types';
import { createPerfTimer } from '@/services/performanceLogger';

const ALLOWED_ASSET_TYPES = new Set(['logo', 'image', 'avatar', 'pdf', 'text', 'link']);
const MAX_LIBRARY_LIMIT = 500;

type ProfileLibraryOptions = {
  assetLimit?: number;
  productLimit?: number;
};

const normalizeOptionalLimit = (value: number | undefined) => {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(1, Math.min(MAX_LIBRARY_LIMIT, Math.floor(value as number)));
};

function buildPreviewUrl(storageKey?: string | null) {
  if (!storageKey) return null;
  return `/api/storage/${encodeURIComponent(storageKey)}`;
}

async function readFileAsBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function getProfileLibrary(
  options: ProfileLibraryOptions = {},
): Promise<ProfileLibrary | null> {
  const session = await getSession();
  if (!session || !session.userId) {
    return null;
  }

  const assetLimit = normalizeOptionalLimit(options.assetLimit);
  const productLimit = normalizeOptionalLimit(options.productLimit);
  const timer = createPerfTimer('getProfileLibrary', {
    assetLimit,
    productLimit,
  });

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: {
      websiteUrl: true,
      overview: true,
    },
  });

  const assetsRows = assetLimit
    ? await db.query.profileAssets.findMany({
        where: eq(profileAssets.userId, session.userId as string),
        orderBy: [desc(profileAssets.createdAt)],
        limit: assetLimit + 1,
      })
    : await db.query.profileAssets.findMany({
        where: eq(profileAssets.userId, session.userId as string),
        orderBy: [desc(profileAssets.createdAt)],
      });

  const productRows = productLimit
    ? await db.query.profileProducts.findMany({
        where: eq(profileProducts.userId, session.userId as string),
        orderBy: [desc(profileProducts.createdAt)],
        limit: productLimit + 1,
      })
    : await db.query.profileProducts.findMany({
        where: eq(profileProducts.userId, session.userId as string),
        orderBy: [desc(profileProducts.createdAt)],
      });

  const hasMoreAssets = Boolean(assetLimit && assetsRows.length > assetLimit);
  const hasMoreProducts = Boolean(productLimit && productRows.length > productLimit);
  const visibleAssetRows = hasMoreAssets && assetLimit ? assetsRows.slice(0, assetLimit) : assetsRows;
  const visibleProductRows = hasMoreProducts && productLimit ? productRows.slice(0, productLimit) : productRows;
  timer.mark('base_queries_complete', {
    assets: visibleAssetRows.length,
    products: visibleProductRows.length,
    hasMoreAssets,
    hasMoreProducts,
  });

  const productIds = visibleProductRows.map(row => row.id);
  const productAssetRows = productIds.length > 0 ? await db.select({
    id: profileProductAssets.id,
    profileProductId: profileProductAssets.profileProductId,
    role: profileProductAssets.role,
    isPrimary: profileProductAssets.isPrimary,
    assetId: profileAssets.id,
    assetName: profileAssets.name,
    assetType: profileAssets.type,
    assetStorageKey: profileAssets.storageKey,
    assetMimeType: profileAssets.mimeType,
    assetMetadata: profileAssets.metadata,
  })
    .from(profileProductAssets)
    .innerJoin(profileAssets, eq(profileProductAssets.profileAssetId, profileAssets.id))
    .where(inArray(profileProductAssets.profileProductId, productIds)) : [];
  timer.mark('product_assets_query_complete', { linkedProductAssets: productAssetRows.length });

  const assets: ProfileAsset[] = visibleAssetRows.map(asset => ({
    id: asset.id,
    type: asset.type,
    name: asset.name,
    mimeType: asset.mimeType,
    previewUrl: buildPreviewUrl(asset.storageKey),
    category: (asset.metadata as { category?: string } | null)?.category ?? null,
    imageType: (asset.metadata as { imageType?: string } | null)?.imageType ?? null,
    createdAt: asset.createdAt ? new Date(asset.createdAt).getTime() : undefined,
  }));

  const products: ProfileProduct[] = visibleProductRows.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    productType: product.productType,
    createdAt: product.createdAt ? new Date(product.createdAt).getTime() : undefined,
    assets: productAssetRows
      .filter(asset => asset.profileProductId === product.id)
      .map(asset => ({
        id: asset.id,
        assetId: asset.assetId,
        role: asset.role,
        isPrimary: asset.isPrimary,
        previewUrl: buildPreviewUrl(asset.assetStorageKey),
      })),
  }));

  const result: ProfileLibrary = {
    profile: {
      websiteUrl: user?.websiteUrl ?? null,
      overview: user?.overview ?? null,
    },
    assets,
    products,
    meta: {
      hasMoreAssets,
      hasMoreProducts,
      assetLimit,
      productLimit,
    },
  };
  timer.done({ assets: assets.length, products: products.length });
  return result;
}

export async function uploadProfileAssetAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const files = formData
    .getAll('file')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const assetType = (formData.get('assetType') as string | null) || 'image';
  const category = (formData.get('category') as string | null) || null;
  const imageTypeInput = (formData.get('imageType') as string | null) || null;

  if (files.length === 0) {
    redirect('/profile?error=missing_file');
  }

  if (!ALLOWED_ASSET_TYPES.has(assetType)) {
    redirect('/profile?error=invalid_asset_type');
  }

  for (const file of files) {
    if (assetType === 'pdf' && file.type !== 'application/pdf') {
      redirect('/profile?error=invalid_pdf');
    }

    if (['logo', 'image', 'avatar'].includes(assetType) && !file.type.startsWith('image/')) {
      redirect('/profile?error=invalid_image');
    }
  }

  const inferImageType = (fileName: string): string | null => {
    const name = fileName.toLowerCase();
    if (/screenshot|screen|dashboard|ui|app|saas|software|website|landing|product[-\s]?tour|walkthrough|demo/.test(name)) {
      return 'ui';
    }
    if (/packaging|box|label|bottle|jar|container|tube|bag|unbox/.test(name)) {
      return 'packaging';
    }
    if (/lifestyle|in[-\s]?use|usage|holding|wearing|outdoor|gym|kitchen|model/.test(name)) {
      return 'lifestyle';
    }
    if (/product|hero|packshot|flatlay|macro/.test(name)) {
      return 'product';
    }
    if (/background|setting|scene|environment|interior|exterior|studio/.test(name)) {
      return 'setting';
    }
    return null;
  };

  for (const file of files) {
    const base64 = await readFileAsBase64(file);
    const isImage = file.type.startsWith('image/');
    let storageKey: string | null = null;
    let content: string | null = base64;
    const assetId = crypto.randomUUID();
    const inferredImageType = assetType === 'image' ? inferImageType(file.name) : null;
    const imageType = imageTypeInput || inferredImageType;

    if (isImage && ['logo', 'image', 'avatar'].includes(assetType)) {
      const uploadResult = await uploadProfileAsset(session.userId as string, assetId, base64, file.type);
      if (!uploadResult.success || !uploadResult.storageKey) {
        redirect('/profile?error=upload_failed');
      }
      storageKey = uploadResult.storageKey;
      content = null;
    }

    await db.insert(profileAssets).values({
      id: assetId,
      userId: session.userId as string,
      type: assetType as 'logo' | 'image' | 'avatar' | 'pdf' | 'text' | 'link',
      name: file.name,
      content,
      storageKey,
      mimeType: file.type,
      metadata: {
        ...(category ? { category } : {}),
        ...(imageType ? { imageType } : {})
      },
    });
  }

  revalidatePath('/profile');
  redirect('/profile?updated=library');
}

export async function deleteProfileAssetAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const assetId = formData.get('assetId') as string | null;
  if (!assetId) {
    redirect('/profile?error=missing_asset');
  }

  const asset = await db.query.profileAssets.findFirst({
    where: and(eq(profileAssets.id, assetId), eq(profileAssets.userId, session.userId as string)),
  });

  if (!asset) {
    redirect('/profile?error=asset_not_found');
  }

  if (asset.storageKey) {
    await deleteFromStorage(asset.storageKey);
  }

  await db.delete(profileAssets).where(eq(profileAssets.id, assetId));

  revalidatePath('/profile');
  redirect('/profile?updated=library');
}

export async function createProfileProductAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const name = (formData.get('name') as string | null)?.trim();
  const description = (formData.get('description') as string | null)?.trim() || null;
  const productType = (formData.get('productType') as string | null) || 'physical_product';

  if (!name) {
    redirect('/profile?error=missing_product_name');
  }

  await db.insert(profileProducts).values({
    id: crypto.randomUUID(),
    userId: session.userId as string,
    name,
    description,
    productType: productType as 'physical_product' | 'software' | 'service' | 'digital_product' | 'hardware',
  });

  revalidatePath('/profile');
  redirect('/profile?updated=product');
}

export async function deleteProfileProductAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const productId = formData.get('productId') as string | null;
  if (!productId) {
    redirect('/profile?error=missing_product');
  }

  const product = await db.query.profileProducts.findFirst({
    where: and(eq(profileProducts.id, productId), eq(profileProducts.userId, session.userId as string)),
  });

  if (!product) {
    redirect('/profile?error=product_not_found');
  }

  const assetsToDelete = await db.select({
    assetId: profileAssets.id,
    storageKey: profileAssets.storageKey,
  })
    .from(profileProductAssets)
    .innerJoin(profileAssets, eq(profileProductAssets.profileAssetId, profileAssets.id))
    .where(eq(profileProductAssets.profileProductId, productId));

  for (const asset of assetsToDelete) {
    if (asset.storageKey) {
      await deleteFromStorage(asset.storageKey);
    }
    await db.delete(profileAssets).where(eq(profileAssets.id, asset.assetId));
  }

  await db.delete(profileProducts).where(eq(profileProducts.id, productId));
  revalidatePath('/profile');
  redirect('/profile?updated=product');
}

export async function addProfileProductAssetAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const profileProductId = formData.get('profileProductId') as string | null;
  const role = (formData.get('role') as string | null) || 'hero';
  const file = formData.get('file') as File | null;

  if (!profileProductId) {
    redirect('/profile?error=missing_product');
  }

  if (!file || file.size === 0) {
    redirect('/profile?error=missing_file');
  }

  const product = await db.query.profileProducts.findFirst({
    where: and(eq(profileProducts.id, profileProductId), eq(profileProducts.userId, session.userId as string)),
  });

  if (!product) {
    redirect('/profile?error=product_not_found');
  }

  if (!file.type.startsWith('image/')) {
    redirect('/profile?error=invalid_product_asset');
  }

  const base64 = await readFileAsBase64(file);
  const assetId = crypto.randomUUID();
  const uploadResult = await uploadProfileAsset(session.userId as string, assetId, base64, file.type);
  if (!uploadResult.success || !uploadResult.storageKey) {
    redirect('/profile?error=upload_failed');
  }

  await db.insert(profileAssets).values({
    id: assetId,
    userId: session.userId as string,
    type: 'image',
    name: file.name,
    content: null,
    storageKey: uploadResult.storageKey,
    mimeType: file.type,
    metadata: { category: 'product' },
  });

  await db.insert(profileProductAssets).values({
    id: crypto.randomUUID(),
    profileProductId,
    profileAssetId: assetId,
    role: role as 'product_shot' | 'packaging' | 'mockup' | 'screenshot' | 'in_use' | 'lifestyle' | 'hero' | 'logo' | 'ui' | 'other',
    isPrimary: false,
  });

  revalidatePath('/profile');
  redirect('/profile?updated=product_assets');
}
