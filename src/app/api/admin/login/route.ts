import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createAdminSessionToken, setAdminCookie } from '@/lib/session';
import { RATE_LIMITS } from '@/lib/config';

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit(
    `admin_login:${ip}`,
    RATE_LIMITS.ADMIN_LOGIN.limit,
    RATE_LIMITS.ADMIN_LOGIN.windowMs
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Too many failed login attempts. For security, please wait 15 minutes before trying again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (rateLimitResult.resetAt - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload' },
      { status: 400 }
    );
  }

  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid input',
      },
      { status: 400 }
    );
  }

  const configuredPassword = process.env.ADMIN_PASSWORD;

  // In development without configured password, provide a warning fallback password
  // Never expose or allow this in production!
  const effectivePassword =
    configuredPassword ||
    (process.env.NODE_ENV !== 'production' ? 'admin123' : '');

  if (!effectivePassword) {
    return NextResponse.json(
      {
        success: false,
        error:
          'ADMIN_PASSWORD environment variable is not configured on the server.',
      },
      { status: 500 }
    );
  }

  // Constant-time comparison or direct string equality check
  if (validation.data.password !== effectivePassword) {
    return NextResponse.json(
      {
        success: false,
        error: 'Incorrect staff admin password. Please try again.',
      },
      { status: 401 }
    );
  }

  // Generate secure JWT session token
  const token = await createAdminSessionToken();

  const response = NextResponse.json({
    success: true,
    message: 'Staff login successful',
  });

  // Set HTTP-only, secure, SameSite=Lax cookie
  setAdminCookie(response, token);

  return response;
}
