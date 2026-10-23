import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyStaffCode } from '@/lib/totp';
import { recordStudentPurchase } from '@/lib/supabase/db';
import { RATE_LIMITS } from '@/lib/config';

export const dynamic = 'force-dynamic';

const verifyStampSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(3, { message: 'Student ID must be at least 3 characters' })
    .max(30, { message: 'Student ID must be at most 30 characters' })
    .regex(/^[A-Za-z0-9_-]+$/, {
      message: 'Student ID should only contain letters, numbers, and hyphens',
    }),
  code: z
    .string()
    .trim()
    .length(6, { message: 'Verification code must be exactly 6 digits' })
    .regex(/^\d{6}$/, { message: 'Verification code must contain only numbers' }),
});

export async function POST(request: NextRequest) {
  // 1. Rate limit by IP to prevent code brute-forcing
  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit(
    `verify_stamp:${ip}`,
    RATE_LIMITS.VERIFY_STAMP.limit,
    RATE_LIMITS.VERIFY_STAMP.windowMs
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many verification attempts. Please wait 1 minute before trying again.',
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

  // 2. Parse & validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload' },
      { status: 400 }
    );
  }

  const validation = verifyStampSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid input data',
      },
      { status: 400 }
    );
  }

  const { studentId, code } = validation.data;

  // 3. Verify 30-second staff rolling code (with drift tolerance and replay protection)
  const codeVerification = verifyStaffCode(code, studentId);
  if (!codeVerification.valid) {
    return NextResponse.json(
      {
        success: false,
        error:
          codeVerification.error ||
          'Invalid or expired staff verification code. Please check the current code on the staff terminal.',
      },
      { status: 400 }
    );
  }

  // 4. Record purchase atomically and award stamp
  try {
    const updated = await recordStudentPurchase(studentId);

    const isRewardUnlocked = updated.free_drinks_available > 0;
    const message = isRewardUnlocked
      ? `🎉 Stamp recorded! You now have a FREE DRINK ready to claim at the counter!`
      : `Stamp recorded successfully! You have ${updated.current_stamps} of ${updated.stamps_required} stamps.`;

    return NextResponse.json({
      success: true,
      message,
      data: updated,
    });
  } catch (err: unknown) {
    console.error('Error awarding stamp:', err);
    const msg =
      err instanceof Error ? err.message : 'Failed to record purchase';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 400 }
    );
  }
}
