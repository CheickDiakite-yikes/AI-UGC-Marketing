'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getSession } from './authActions';
import { hashPassword, verifyPassword } from '@/services/authService';

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  websiteUrl: string | null;
  overview: string | null;
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
