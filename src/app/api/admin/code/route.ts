import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/session';
import { getCurrentRollingCode } from '@/lib/totp';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Verify staff admin session
  const session = await verifyAdminRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Staff session expired or invalid' },
      { status: 401 }
    );
  }

  // 2. Generate current rolling code and countdown
  try {
    const rollingData = getCurrentRollingCode();
    return NextResponse.json({
      success: true,
      data: {
        code: rollingData.code,
        secondsRemaining: rollingData.secondsRemaining,
        timeStep: rollingData.timeStep,
      },
    });
  } catch (err: unknown) {
    console.error('Error generating rolling code:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate verification code' },
      { status: 500 }
    );
  }
}
