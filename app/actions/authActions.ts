
'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '@/services/authService';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'predi_session';

export async function signup(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const company = formData.get('company') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const referralSource = formData.get('referralSource') as string;

    if (!email || !password || !name) {
        return { error: 'Missing required fields' };
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (existingUser) {
        return { error: 'User already exists' };
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db.insert(users).values({
        email,
        passwordHash: hashedPassword,
        name,
        company,
        jobTitle,
        referralSource,
        avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${name}` // Default avatar
    }).returning();

    const token = await createSessionToken({ userId: newUser.id, email: newUser.email! });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    redirect('/');
}

export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Missing credentials' };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (!user || !user.passwordHash) {
        return { error: 'Invalid credentials' };
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
        return { error: 'Invalid credentials' };
    }

    const token = await createSessionToken({ userId: user.id, email: user.email! });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    redirect('/');
}

export async function logout() {
    (await cookies()).delete(COOKIE_NAME);
    redirect('/login');
}

export async function getSession() {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
}
