export interface StudentLoyalty {
  student_id: string;
  current_stamps: number;
  lifetime_purchases: number;
  lifetime_redemptions: number;
  free_drinks_available: number;
  stamps_required: number;
  stamps_until_next_reward: number;
  last_activity?: string;
  created_at?: string;
}

export type CustomerLookupResponse = {
  success: boolean;
  data?: {
    student_id: string;
    current_stamps: number;
    lifetime_purchases: number;
    free_drinks_available: number;
    stamps_required: number;
    stamps_until_next_reward: number;
  };
  error?: string;
};

export type TransactionType = 'PURCHASE' | 'REDEMPTION';

export interface LoyaltyTransaction {
  id: string;
  student_id: string;
  type: TransactionType;
  stamps_delta: number;
  notes?: string;
  created_at: string;
}

export interface AdminSession {
  role: 'admin';
  authenticatedAt: number;
}
