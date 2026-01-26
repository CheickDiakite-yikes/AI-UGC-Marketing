'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getSession } from './authActions';
import { hashPassword, verifyPassword } from '@/services/authService';

export type BrandContext = {
  companyName?: string;
  description?: string;
  industry?: string;
  keyOfferings?: string[];
  targetAudience?: string;
  tagline?: string;
  brandColors?: string[];
  socialLinks?: { platform: string; url: string }[];
  contactEmail?: string;
  missionStatement?: string;
  foundedYear?: string;
  teamSize?: string;
  autoDetected?: boolean;
  detectedAt?: string;
};

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  websiteUrl: string | null;
  overview: string | null;
  brandContext: BrandContext | null;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const session = await getSession();
  if (!session || !session.userId) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: {
      id: true,
      name: true,
      email: true,
      company: true,
      jobTitle: true,
      avatarUrl: true,
      websiteUrl: true,
      overview: true,
      brandContext: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    company: user.company ?? null,
    jobTitle: user.jobTitle ?? null,
    avatarUrl: user.avatarUrl ?? null,
    websiteUrl: user.websiteUrl ?? null,
    overview: user.overview ?? null,
    brandContext: (user.brandContext as BrandContext) ?? null,
  };
}

export async function updateUserProfile(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const name = (formData.get('name') as string | null)?.trim();
  const company = (formData.get('company') as string | null)?.trim() || null;
  const jobTitle = (formData.get('jobTitle') as string | null)?.trim() || null;

  if (!name) {
    redirect('/profile?error=missing_name');
  }

  await db
    .update(users)
    .set({ name, company, jobTitle })
    .where(eq(users.id, session.userId as string));

  revalidatePath('/profile');
  redirect('/profile?updated=profile');
}

export async function updateProfileBasics(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const websiteUrl = (formData.get('websiteUrl') as string | null)?.trim() || null;
  const overview = (formData.get('overview') as string | null)?.trim() || null;

  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
    redirect('/profile?error=invalid_website');
  }

  await db
    .update(users)
    .set({ websiteUrl, overview })
    .where(eq(users.id, session.userId as string));

  revalidatePath('/profile');
  redirect('/profile?updated=basics');
}

export async function updateUserPassword(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const currentPassword = (formData.get('currentPassword') as string | null) || '';
  const newPassword = (formData.get('newPassword') as string | null) || '';
  const confirmPassword = (formData.get('confirmPassword') as string | null) || '';

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect('/profile?error=missing_password_fields');
  }

  if (newPassword !== confirmPassword) {
    redirect('/profile?error=password_mismatch');
  }

  if (newPassword.length < 8) {
    redirect('/profile?error=weak_password');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: {
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    redirect('/profile?error=missing_password');
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    redirect('/profile?error=invalid_current_password');
  }

  const hashedPassword = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: hashedPassword })
    .where(eq(users.id, session.userId as string));

  revalidatePath('/profile');
  redirect('/profile?updated=password');
}

export async function updateBrandContext(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: { brandContext: true, company: true, overview: true },
  });

  const existingContext = (user?.brandContext as BrandContext) || {};

  const company = (formData.get('company') as string | null)?.trim() || existingContext.companyName || null;
  const tagline = (formData.get('tagline') as string | null)?.trim() || null;
  const industry = (formData.get('industry') as string | null)?.trim() || null;
  const targetAudience = (formData.get('targetAudience') as string | null)?.trim() || null;
  const contactEmail = (formData.get('contactEmail') as string | null)?.trim() || null;
  const missionStatement = (formData.get('missionStatement') as string | null)?.trim() || null;
  const foundedYear = (formData.get('foundedYear') as string | null)?.trim() || null;
  const teamSize = (formData.get('teamSize') as string | null)?.trim() || null;
  const brandColorsRaw = formData.get('brandColors') as string | null;
  const socialLinksRaw = formData.get('socialLinks') as string | null;

  let brandColors: string[] = existingContext.brandColors || [];
  if (brandColorsRaw) {
    try {
      brandColors = JSON.parse(brandColorsRaw);
    } catch {
      brandColors = brandColorsRaw.split(',').map(c => c.trim()).filter(Boolean);
    }
  }

  let socialLinks: { platform: string; url: string }[] = existingContext.socialLinks || [];
  if (socialLinksRaw) {
    try {
      socialLinks = JSON.parse(socialLinksRaw);
    } catch {
      socialLinks = [];
    }
  }

  const updatedContext: BrandContext = {
    ...existingContext,
    companyName: company || existingContext.companyName,
    tagline,
    industry,
    targetAudience,
    contactEmail,
    missionStatement,
    foundedYear,
    teamSize,
    brandColors,
    socialLinks,
  };

  await db
    .update(users)
    .set({
      company: company || user?.company,
      brandContext: updatedContext,
    })
    .where(eq(users.id, session.userId as string));

  revalidatePath('/profile/company');
  redirect('/profile/company?updated=brand_context');
}

export async function addBrandColor(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const color = (formData.get('color') as string | null)?.trim();
  if (!color) {
    redirect('/profile/company?error=invalid_color');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: { brandContext: true },
  });

  const existingContext = (user?.brandContext as BrandContext) || {};
  const brandColors = existingContext.brandColors || [];

  if (!brandColors.includes(color)) {
    brandColors.push(color);
  }

  await db
    .update(users)
    .set({
      brandContext: { ...existingContext, brandColors },
    })
    .where(eq(users.id, session.userId as string));

  revalidatePath('/profile/company');
  redirect('/profile/company?updated=brand_context');
}

export async function removeBrandColor(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const color = formData.get('color') as string | null;
  if (!color) {
    redirect('/profile/company?error=invalid_color');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: { brandContext: true },
  });

  const existingContext = (user?.brandContext as BrandContext) || {};
  const brandColors = (existingContext.brandColors || []).filter(c => c !== color);

  await db
    .update(users)
    .set({
      brandContext: { ...existingContext, brandColors },
    })
    .where(eq(users.id, session.userId as string));

  revalidatePath('/profile/company');
  redirect('/profile/company?updated=brand_context');
}

export async function addSocialLink(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const platform = (formData.get('platform') as string | null)?.trim();
  const url = (formData.get('url') as string | null)?.trim();

  if (!platform || !url) {
    redirect('/profile/company?error=invalid_social_link');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: { brandContext: true },
  });

  const existingContext = (user?.brandContext as BrandContext) || {};
  const socialLinks = existingContext.socialLinks || [];
  socialLinks.push({ platform, url });

  await db
    .update(users)
    .set({
      brandContext: { ...existingContext, socialLinks },
    })
    .where(eq(users.id, session.userId as string));

  revalidatePath('/profile/company');
  redirect('/profile/company?updated=brand_context');
}

export async function removeSocialLink(formData: FormData) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const index = parseInt(formData.get('index') as string, 10);
  if (isNaN(index) || index < 0) {
    redirect('/profile/company?error=invalid_social_link');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId as string),
    columns: { brandContext: true },
  });

  const existingContext = (user?.brandContext as BrandContext) || {};
  const socialLinks = (existingContext.socialLinks || []).filter((_, i) => i !== index);

  await db
    .update(users)
    .set({
      brandContext: { ...existingContext, socialLinks },
    })
    .where(eq(users.id, session.userId as string));

  revalidatePath('/profile/company');
  redirect('/profile/company?updated=brand_context');
}
