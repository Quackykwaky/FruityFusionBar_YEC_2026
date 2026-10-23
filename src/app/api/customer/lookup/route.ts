import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStudentLoyalty } from '@/lib/supabase/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/config';

export const dynamic = 'force-dynamic';

// Server-side validation schema: student ID must be 3-30 chars, alphanumeric with optional hyphens
const lookupSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(3, { message: 'Student ID must be at least 3 characters' })
    .max(30, { message: 'Student ID must be at most 30 characters' })
    .regex(/^[A-Za-z0-9_-]+$/, {
      message: 'Student ID should only contain letters, numbers, and hyphens',
    }),
});

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit(
    `customer_lookup:${ip}`,
    RATE_LIMITS.CUSTOMER_LOOKUP.limit,
    RATE_LIMITS.CUSTOMER_LOOKUP.windowMs
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please slow down and try again in a moment.',
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

  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get('id');

  const validation = lookupSchema.safeParse({ studentId: rawId });
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid Student ID',
      },
      { status: 400 }
    );
  }

  try {
    const student = await getStudentLoyalty(validation.data.studentId);

    // Return ONLY the minimal loyalty data needed for customer display
    return NextResponse.json({
      success: true,
      data: {
        student_id: student.student_id,
        current_stamps: student.current_stamps,
        lifetime_purchases: student.lifetime_purchases,
        free_drinks_available: student.free_drinks_available,
        stamps_required: student.stamps_required,
        stamps_until_next_reward: student.stamps_until_next_reward,
      },
    });
  } catch (err: unknown) {
    console.error('Customer lookup error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to check student loyalty. Please try again.',
      },
      { status: 500 }
    );
  }
}
