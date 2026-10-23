-- ==============================================================================
-- Fruity Fusion Bar Student Loyalty Program - Supabase PostgreSQL Schema
-- ==============================================================================

-- 1. Create Students / Customer Loyalty Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    current_stamps INTEGER NOT NULL DEFAULT 0 CHECK (current_stamps >= 0),
    lifetime_purchases INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_purchases >= 0),
    lifetime_redemptions INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_redemptions >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Loyalty Transactions Audit Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(student_id) ON UPDATE CASCADE ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('PURCHASE', 'REDEMPTION')),
    stamps_delta INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for fast lookup and ordered activity queries
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON public.transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 4. Enable Row Level Security (RLS)
-- Direct client requests with the anon key cannot read or modify private student data.
-- All operations are performed server-side with SUPABASE_SERVICE_ROLE_KEY.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 5. Atomic PostgreSQL Function: Get or Create Student Loyalty Record
CREATE OR REPLACE FUNCTION public.get_or_create_student(
    p_student_id TEXT
)
RETURNS TABLE (
    student_id TEXT,
    current_stamps INTEGER,
    lifetime_purchases INTEGER,
    lifetime_redemptions INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_id TEXT;
BEGIN
    v_clean_id := UPPER(TRIM(p_student_id));
    
    IF v_clean_id IS NULL OR length(v_clean_id) = 0 THEN
        RAISE EXCEPTION 'Student ID cannot be empty';
    END IF;

    -- Insert student if not exists
    INSERT INTO public.students (student_id, current_stamps, lifetime_purchases, lifetime_redemptions)
    VALUES (v_clean_id, 0, 0, 0)
    ON CONFLICT (student_id) DO NOTHING;

    RETURN QUERY
    SELECT s.student_id, s.current_stamps, s.lifetime_purchases, s.lifetime_redemptions, s.created_at, s.updated_at
    FROM public.students s
    WHERE s.student_id = v_clean_id;
END;
$$;

-- 6. Atomic PostgreSQL Function: Record Purchase (+1 Stamp)
-- Uses SELECT ... FOR UPDATE to prevent race conditions and concurrent stamp loss
CREATE OR REPLACE FUNCTION public.record_student_purchase(
    p_student_id TEXT,
    p_stamps_required INTEGER DEFAULT 3
)
RETURNS TABLE (
    student_id TEXT,
    current_stamps INTEGER,
    lifetime_purchases INTEGER,
    lifetime_redemptions INTEGER,
    free_drinks_available INTEGER,
    stamps_until_next_reward INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_id TEXT;
    v_stamps INTEGER;
    v_lifetime INTEGER;
    v_redemptions INTEGER;
    v_created_at TIMESTAMPTZ;
    v_updated_at TIMESTAMPTZ;
BEGIN
    v_clean_id := UPPER(TRIM(p_student_id));

    IF v_clean_id IS NULL OR length(v_clean_id) = 0 THEN
        RAISE EXCEPTION 'Student ID cannot be empty';
    END IF;

    -- Ensure record exists
    INSERT INTO public.students (student_id, current_stamps, lifetime_purchases, lifetime_redemptions)
    VALUES (v_clean_id, 0, 0, 0)
    ON CONFLICT (student_id) DO NOTHING;

    -- Acquire row lock
    SELECT s.current_stamps, s.lifetime_purchases, s.lifetime_redemptions, s.created_at
    INTO v_stamps, v_lifetime, v_redemptions, v_created_at
    FROM public.students s
    WHERE s.student_id = v_clean_id
    FOR UPDATE;

    -- Do not award more stamps while a reward is awaiting redemption
    IF v_stamps >= p_stamps_required THEN
        RAISE EXCEPTION 'A free drink reward is already available! Please redeem your reward with staff before collecting more stamps.';
    END IF;

    -- Increment stamps & purchases
    v_stamps := v_stamps + 1;
    v_lifetime := v_lifetime + 1;
    v_updated_at := timezone('utc'::text, now());

    UPDATE public.students
    SET current_stamps = v_stamps,
        lifetime_purchases = v_lifetime,
        updated_at = v_updated_at
    WHERE public.students.student_id = v_clean_id;

    -- Record transaction audit entry
    INSERT INTO public.transactions (student_id, type, stamps_delta, notes)
    VALUES (v_clean_id, 'PURCHASE', 1, 'Eligible drink purchase');

    RETURN QUERY
    SELECT 
        v_clean_id,
        v_stamps,
        v_lifetime,
        v_redemptions,
        FLOOR(v_stamps / p_stamps_required)::INTEGER,
        CASE 
            WHEN (v_stamps % p_stamps_required) = 0 THEN 0
            ELSE p_stamps_required - (v_stamps % p_stamps_required)
        END,
        v_created_at,
        v_updated_at;
END;
$$;

-- 7. Atomic PostgreSQL Function: Redeem Free Drink Reward
-- Uses SELECT ... FOR UPDATE and enforces minimum required stamps atomically
CREATE OR REPLACE FUNCTION public.redeem_student_reward(
    p_student_id TEXT,
    p_stamps_required INTEGER DEFAULT 3
)
RETURNS TABLE (
    student_id TEXT,
    current_stamps INTEGER,
    lifetime_purchases INTEGER,
    lifetime_redemptions INTEGER,
    free_drinks_available INTEGER,
    stamps_until_next_reward INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_id TEXT;
    v_stamps INTEGER;
    v_lifetime INTEGER;
    v_redemptions INTEGER;
    v_created_at TIMESTAMPTZ;
    v_updated_at TIMESTAMPTZ;
BEGIN
    v_clean_id := UPPER(TRIM(p_student_id));

    IF v_clean_id IS NULL OR length(v_clean_id) = 0 THEN
        RAISE EXCEPTION 'Student ID cannot be empty';
    END IF;

    -- Lock student row
    SELECT s.current_stamps, s.lifetime_purchases, s.lifetime_redemptions, s.created_at
    INTO v_stamps, v_lifetime, v_redemptions, v_created_at
    FROM public.students s
    WHERE s.student_id = v_clean_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', v_clean_id;
    END IF;

    IF v_stamps < p_stamps_required THEN
        RAISE EXCEPTION 'Insufficient stamps. % stamps required, customer has %.', p_stamps_required, v_stamps;
    END IF;

    -- Deduct required stamps for one free drink and increment lifetime redemptions
    v_stamps := v_stamps - p_stamps_required;
    v_redemptions := v_redemptions + 1;
    v_updated_at := timezone('utc'::text, now());

    UPDATE public.students
    SET current_stamps = v_stamps,
        lifetime_redemptions = v_redemptions,
        updated_at = v_updated_at
    WHERE public.students.student_id = v_clean_id;

    -- Record transaction audit entry
    INSERT INTO public.transactions (student_id, type, stamps_delta, notes)
    VALUES (v_clean_id, 'REDEMPTION', -p_stamps_required, 'Free drink redeemed at stall');

    RETURN QUERY
    SELECT 
        v_clean_id,
        v_stamps,
        v_lifetime,
        v_redemptions,
        FLOOR(v_stamps / p_stamps_required)::INTEGER,
        CASE 
            WHEN (v_stamps % p_stamps_required) = 0 THEN p_stamps_required
            ELSE p_stamps_required - (v_stamps % p_stamps_required)
        END,
        v_created_at,
        v_updated_at;
END;
$$;
