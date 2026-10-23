import { getSupabaseAdmin } from './client';
import { STAMPS_REQUIRED } from '../config';
import { StudentLoyalty, LoyaltyTransaction } from '@/types';

// In-memory fallback mock database for instant local development/testing
// when Supabase credentials are not yet supplied in .env.local
interface MockStudent {
  student_id: string;
  current_stamps: number;
  lifetime_purchases: number;
  lifetime_redemptions: number;
  created_at: string;
  updated_at: string;
}

const mockStudents = new Map<string, MockStudent>();
const mockTransactions: LoyaltyTransaction[] = [];

// Helper to normalize student IDs
export function sanitizeStudentId(id: string): string {
  return id.trim().toUpperCase();
}

// Compute calculated loyalty metrics
function calculateMetrics(
  student: { current_stamps: number; lifetime_purchases: number; lifetime_redemptions: number; student_id: string; created_at?: string; updated_at?: string },
  stampsRequired = STAMPS_REQUIRED
): StudentLoyalty {
  const freeDrinks = Math.floor(student.current_stamps / stampsRequired);
  const remainder = student.current_stamps % stampsRequired;
  const stampsUntilNext = remainder === 0 ? stampsRequired : stampsRequired - remainder;

  return {
    student_id: student.student_id,
    current_stamps: student.current_stamps,
    lifetime_purchases: student.lifetime_purchases,
    lifetime_redemptions: student.lifetime_redemptions,
    free_drinks_available: freeDrinks,
    stamps_required: stampsRequired,
    stamps_until_next_reward: stampsUntilNext,
    created_at: student.created_at,
    last_activity: student.updated_at,
  };
}

export async function getStudentLoyalty(rawId: string): Promise<StudentLoyalty> {
  const studentId = sanitizeStudentId(rawId);
  if (!studentId) {
    throw new Error('Student ID is required');
  }

  const supabase = getSupabaseAdmin();

  if (supabase) {
    // Try calling the atomic RPC function
    const { data, error } = await supabase.rpc('get_or_create_student', {
      p_student_id: studentId,
    });

    if (!error && data && data.length > 0) {
      const row = data[0];
      return calculateMetrics(row);
    }

    // Fallback direct query if RPC isn't created yet
    const { data: existing, error: selectError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (selectError) {
      console.error('Error fetching student loyalty:', selectError);
    }

    if (existing) {
      return calculateMetrics(existing);
    }

    // Insert new student
    const { data: inserted, error: insertError } = await supabase
      .from('students')
      .insert({
        student_id: studentId,
        current_stamps: 0,
        lifetime_purchases: 0,
        lifetime_redemptions: 0,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to initialize student loyalty record: ${insertError.message}`);
    }

    return calculateMetrics(inserted);
  }

  // In-Memory Dev Store Fallback
  let student = mockStudents.get(studentId);
  const now = new Date().toISOString();

  if (!student) {
    student = {
      student_id: studentId,
      current_stamps: 0,
      lifetime_purchases: 0,
      lifetime_redemptions: 0,
      created_at: now,
      updated_at: now,
    };
    mockStudents.set(studentId, student);
  }

  return calculateMetrics(student);
}

export async function recordStudentPurchase(rawId: string): Promise<StudentLoyalty> {
  const studentId = sanitizeStudentId(rawId);
  if (!studentId) {
    throw new Error('Student ID is required');
  }

  const supabase = getSupabaseAdmin();

  if (supabase) {
    // Call atomic PostgreSQL function
    const { data, error } = await supabase.rpc('record_student_purchase', {
      p_student_id: studentId,
      p_stamps_required: STAMPS_REQUIRED,
    });

    if (error) {
      console.error('Error in record_student_purchase RPC:', error);
      // Fallback to table transaction
      const current = await getStudentLoyalty(studentId);
      if (current.current_stamps >= STAMPS_REQUIRED) {
        throw new Error(
          'A free drink reward is already available! Please redeem your reward with staff before collecting more stamps.'
        );
      }
      const newStamps = current.current_stamps + 1;
      const newPurchases = current.lifetime_purchases + 1;

      const { data: updated, error: updateError } = await supabase
        .from('students')
        .update({
          current_stamps: newStamps,
          lifetime_purchases: newPurchases,
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update purchase: ${updateError.message}`);
      }

      await supabase.from('transactions').insert({
        student_id: studentId,
        type: 'PURCHASE',
        stamps_delta: 1,
        notes: 'Eligible drink purchase',
      });

      return calculateMetrics(updated);
    }

    if (data && data.length > 0) {
      return calculateMetrics(data[0]);
    }
  }

  // In-Memory Dev Store
  let target = mockStudents.get(studentId);
  const now = new Date().toISOString();

  if (!target) {
    target = {
      student_id: studentId,
      current_stamps: 0,
      lifetime_purchases: 0,
      lifetime_redemptions: 0,
      created_at: now,
      updated_at: now,
    };
  }

  if (target.current_stamps >= STAMPS_REQUIRED) {
    throw new Error(
      'A free drink reward is already available! Please redeem your reward with staff before collecting more stamps.'
    );
  }

  target.current_stamps += 1;
  target.lifetime_purchases += 1;
  target.updated_at = now;
  mockStudents.set(studentId, target);

  mockTransactions.unshift({
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    student_id: studentId,
    type: 'PURCHASE',
    stamps_delta: 1,
    notes: 'Eligible drink purchase',
    created_at: new Date().toISOString(),
  });

  return calculateMetrics(target);
}

export async function redeemStudentReward(rawId: string): Promise<StudentLoyalty> {
  const studentId = sanitizeStudentId(rawId);
  if (!studentId) {
    throw new Error('Student ID is required');
  }

  const supabase = getSupabaseAdmin();

  if (supabase) {
    // Call atomic PostgreSQL function
    const { data, error } = await supabase.rpc('redeem_student_reward', {
      p_student_id: studentId,
      p_stamps_required: STAMPS_REQUIRED,
    });

    if (error) {
      console.error('Error in redeem_student_reward RPC:', error);
      // Check current stamps
      const current = await getStudentLoyalty(studentId);
      if (current.current_stamps < STAMPS_REQUIRED) {
        throw new Error(
          `Customer has ${current.current_stamps} stamps, but ${STAMPS_REQUIRED} are required to claim a free drink.`
        );
      }

      const newStamps = current.current_stamps - STAMPS_REQUIRED;
      const newRedemptions = current.lifetime_redemptions + 1;

      const { data: updated, error: updateError } = await supabase
        .from('students')
        .update({
          current_stamps: newStamps,
          lifetime_redemptions: newRedemptions,
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to redeem reward: ${updateError.message}`);
      }

      await supabase.from('transactions').insert({
        student_id: studentId,
        type: 'REDEMPTION',
        stamps_delta: -STAMPS_REQUIRED,
        notes: 'Free drink redeemed at stall',
      });

      return calculateMetrics(updated);
    }

    if (data && data.length > 0) {
      return calculateMetrics(data[0]);
    }
  }

  // In-Memory Dev Store
  const target = mockStudents.get(studentId);
  if (!target || target.current_stamps < STAMPS_REQUIRED) {
    const has = target ? target.current_stamps : 0;
    throw new Error(
      `Insufficient stamps to redeem. Required: ${STAMPS_REQUIRED}, customer has: ${has}.`
    );
  }

  target.current_stamps -= STAMPS_REQUIRED;
  target.lifetime_redemptions += 1;
  target.updated_at = new Date().toISOString();
  mockStudents.set(studentId, target);

  mockTransactions.unshift({
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    student_id: studentId,
    type: 'REDEMPTION',
    stamps_delta: -STAMPS_REQUIRED,
    notes: 'Free drink redeemed at stall',
    created_at: new Date().toISOString(),
  });

  return calculateMetrics(target);
}

export async function getRecentTransactions(limit = 10): Promise<LoyaltyTransaction[]> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data as LoyaltyTransaction[];
    }
  }

  return mockTransactions.slice(0, limit);
}
