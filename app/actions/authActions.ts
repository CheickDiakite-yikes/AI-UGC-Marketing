
'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '@/services/authService';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'predi_session';

function maskEmail(email?: string | null) {
    if (!email) return null;
    const [name, domain] = email.split('@');
    if (!domain) return 'redacted';
    const maskedName = name.length <= 2 ? `${name[0] || ''}*` : `${name.slice(0, 2)}***`;
    return `${maskedName}@${domain}`;
}

function formatError(error: unknown) {
    if (error instanceof Error) {
        return { message: error.message, stack: error.stack };
    }
    return { message: String(error) };
}

export async function signup(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const company = formData.get('company') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const referralSource = formData.get('referralSource') as string;

    if (!email || !password || !name) {
        return { error: 'Missing required fields', success: false };
    }

    try {
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (existingUser) {
            return { error: 'An account with this email already exists', success: false };
        }

        const hashedPassword = await hashPassword(password);

        const [newUser] = await db.insert(users).values({
            email,
            passwordHash: hashedPassword,
            name,
            company,
            jobTitle,
            referralSource,
            avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${name}`
        }).returning();

        const token = await createSessionToken({ userId: newUser.id, email: newUser.email! });
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60
        });

        return { success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
    } catch (error) {
        console.error('Auth signup failed', {
            email: maskEmail(email),
            error: formatError(error),
        });
        return { error: 'Unable to create account. Please try again.', success: false };
    }
}

export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Please enter both email and password', success: false };
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (!user || !user.passwordHash) {
            return { error: 'Invalid email or password', success: false };
        }

        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
            return { error: 'Invalid email or password', success: false };
        }

        const token = await createSessionToken({ userId: user.id, email: user.email! });

        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60
        });

        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
    } catch (error) {
        console.error('Auth login failed', {
            email: maskEmail(email),
            error: formatError(error),
        });
        return { error: 'Unable to sign in. Please try again.', success: false };
    }
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
