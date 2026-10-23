import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/session';
import { recordStudentPurchase } from '@/lib/supabase/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/config';

const purchaseSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(3, 'Student ID must be at least 3 characters')
    .max(30, 'Student ID must be at most 30 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid student ID characters'),
});

export async function POST(request: NextRequest) {
  // 1. Verify admin session
  const session = await verifyAdminRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Staff session expired or invalid' },
      { status: 401 }
    );
  }

  // 2. Rate limit admin actions
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `admin_action:${ip}`,
    RATE_LIMITS.ADMIN_ACTIONS.limit,
    RATE_LIMITS.ADMIN_ACTIONS.windowMs
  );
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  // 3. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload' },
      { status: 400 }
    );
  }

  const validation = purchaseSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid input data',
      },
      { status: 400 }
    );
  }

  try {
    const updated = await recordStudentPurchase(validation.data.studentId);
    return NextResponse.json({
      success: true,
      message: `Purchase recorded! ${updated.student_id} now has ${updated.current_stamps} stamp${updated.current_stamps === 1 ? '' : 's'}.`,
      data: updated,
    });
  } catch (err: unknown) {
    console.error('Error recording purchase:', err);
    const msg = err instanceof Error ? err.message : 'Failed to record purchase';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
