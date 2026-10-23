import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_DURATION_SECONDS } from './config';
import { AdminSession } from '@/types';

// Fallback session secret for development if not provided
const SESSION_SECRET_STRING =
  process.env.SESSION_SECRET ||
  'fruity-fusion-bar-secret-dev-key-change-in-production-2026';

const secretKey = new TextEncoder().encode(SESSION_SECRET_STRING);

export async function createAdminSessionToken(): Promise<string> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_DURATION_SECONDS}s`)
    .sign(secretKey);

  return token;
}

export async function verifyAdminSessionToken(
  token: string
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (payload.role === 'admin') {
      return {
        role: 'admin',
        authenticatedAt: (payload.iat || 0) * 1000,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setAdminCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
  });
}

export function removeAdminCookie(response: NextResponse): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export async function verifyAdminRequest(
  request: Request
): Promise<AdminSession | null> {
  // Check cookie in header
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`));

  if (!match) return null;
  const token = match.substring(ADMIN_COOKIE_NAME.length + 1);
  return verifyAdminSessionToken(token);
}
