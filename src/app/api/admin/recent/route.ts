import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/session';
import { getRecentTransactions } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await verifyAdminRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Staff session expired' },
      { status: 401 }
    );
  }

  try {
    const transactions = await getRecentTransactions(15);
    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (err: unknown) {
    console.error('Recent transactions error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load transaction history' },
      { status: 500 }
    );
  }
}
