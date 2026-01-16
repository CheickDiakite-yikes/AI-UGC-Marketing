
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

function getSecretKey() {
    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'default-dev-secret-do-not-use-in-prod';
    return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: { userId: string; email: string }) {
    const key = getSecretKey();
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(key);
}

export async function verifySessionToken(token: string) {
    try {
        const key = getSecretKey();
        const { payload } = await jwtVerify(token, key);
        return payload;
    } catch (error) {
        return null;
    }
}
