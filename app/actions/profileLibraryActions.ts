'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { profileAssets, profileProductAssets, profileProducts, users } from '@/db/schema';
import { getSession } from './authActions';
import { uploadProfileAsset, deleteAsset as deleteFromStorage } from '@/services/objectStorageService';
import { ProfileLibrary, ProfileAsset, ProfileProduct } from '@/types';

const ALLOWED_ASSET_TYPES = new Set(['logo', 'image', 'avatar', 'pdf', 'text', 'link']);

function buildPreviewUrl(storageKey?: string | null) {
  if (!storageKey) return null;
  return `/api/storage/${encodeURIComponent(storageKey)}`;
}

async function readFileAsBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function getProfileLibrary(): Promise<ProfileLibrary | null> {
  const session = await getSession();
  if (!session || !session.userId) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: {
      websiteUrl: true,
      overview: true,
    },
  });

  const assetsRows = await db.query.profileAssets.findMany({
    where: eq(profileAssets.userId, session.userId as string),
    orderBy: [desc(profileAssets.createdAt)],
  });

  const productRows = await db.query.profileProducts.findMany({
    where: eq(profileProducts.userId, session.userId as string),
    orderBy: [desc(profileProducts.createdAt)],
  });

  const productIds = productRows.map(row => row.id);
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

  const assets: ProfileAsset[] = assetsRows.map(asset => ({
    id: asset.id,
    type: asset.type,
    name: asset.name,
    mimeType: asset.mimeType,
    previewUrl: buildPreviewUrl(asset.storageKey),
    category: (asset.metadata as { category?: string } | null)?.category ?? null,
    createdAt: asset.createdAt ? new Date(asset.createdAt).getTime() : undefined,
  }));

  const products: ProfileProduct[] = productRows.map(product => ({
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

  return {
    profile: {
      websiteUrl: user?.websiteUrl ?? null,
      overview: user?.overview ?? null,
    },
    assets,
    products,
  };
}

export async function uploadProfileAssetAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const file = formData.get('file') as File | null;
  const assetType = (formData.get('assetType') as string | null) || 'image';
  const category = (formData.get('category') as string | null) || null;

  if (!file || file.size === 0) {
    redirect('/profile?error=missing_file');
  }

  if (!ALLOWED_ASSET_TYPES.has(assetType)) {
    redirect('/profile?error=invalid_asset_type');
  }

  if (assetType === 'pdf' && file.type !== 'application/pdf') {
    redirect('/profile?error=invalid_pdf');
  }

  if (['logo', 'image', 'avatar'].includes(assetType) && !file.type.startsWith('image/')) {
    redirect('/profile?error=invalid_image');
  }

  const base64 = await readFileAsBase64(file);
  const isImage = file.type.startsWith('image/');
  let storageKey: string | null = null;
  let content: string | null = base64;
  const assetId = crypto.randomUUID();

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
    metadata: category ? { category } : null,
  });

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
