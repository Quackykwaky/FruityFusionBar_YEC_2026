import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/session';
import { getStudentLoyalty } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

const searchSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(3, 'Student ID must be at least 3 characters')
    .max(30, 'Student ID must be at most 30 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid student ID characters'),
});

export async function GET(request: NextRequest) {
  // 1. Verify admin session
  const session = await verifyAdminRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Staff session expired or invalid' },
      { status: 401 }
    );
  }

  // 2. Parse & validate student ID
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get('id');

  const validation = searchSchema.safeParse({ studentId: rawId });
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.issues[0]?.message || 'Invalid Student ID' },
      { status: 400 }
    );
  }

  try {
    const student = await getStudentLoyalty(validation.data.studentId);
    return NextResponse.json({
      success: true,
      data: student,
    });
  } catch (err: unknown) {
    console.error('Admin search error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve student loyalty data' },
      { status: 500 }
    );
  }
}
