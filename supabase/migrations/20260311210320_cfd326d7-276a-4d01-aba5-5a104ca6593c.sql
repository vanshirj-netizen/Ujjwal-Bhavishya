
-- 1. ADD NEW COLUMNS TO PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mother_tongue TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS childhood_state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mti_zone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mti_profile_type TEXT DEFAULT 'single';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mti_primary_zone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mti_secondary_zone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chosen_world TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_goal TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_under_18 BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. ADD MISSING COLUMNS TO USER_ROLES (do not recreate)
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_by UUID;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL DEFAULT 'aarambh',
  enrollment_type TEXT DEFAULT 'free_trial'
    CHECK (enrollment_type IN ('free_trial','paid','offline_paid','facilitator_enrolled','second_attempt')),
  payment_status TEXT DEFAULT 'free'
    CHECK (payment_status IN ('free','pending','paid','refunded','refund_initiated')),
  payment_amount DECIMAL(10,2),
  payment_mode TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_refund_id TEXT,
  offline_payment_reference TEXT,
  offline_payment_marked_by UUID REFERENCES profiles(id),
  current_day INTEGER DEFAULT 0,
  days_completed INTEGER DEFAULT 0,
  trial_completed BOOLEAN DEFAULT FALSE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  completion_date TIMESTAMPTZ,
  refund_initiated_at TIMESTAMPTZ,
  refund_completed_at TIMESTAMPTZ,
  refund_reason TEXT,
  second_attempt_eligible BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, course_id)
);

-- 4. WEEKS TABLE
CREATE TABLE IF NOT EXISTS weeks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id TEXT NOT NULL DEFAULT 'aarambh',
  week_number INTEGER NOT NULL,
  theme_name TEXT NOT NULL,
  theme_subtitle TEXT,
  week_type TEXT DEFAULT 'learning'
    CHECK (week_type IN ('learning','graduation','revision')),
  days_in_week INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRANSFORMATION SCORES TABLE
CREATE TABLE IF NOT EXISTS transformation_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES enrollments(id),
  fluency_score DECIMAL(5,2) DEFAULT 0,
  mti_score DECIMAL(5,2) DEFAULT 0,
  grammar_score DECIMAL(5,2) DEFAULT 0,
  consistency_score DECIMAL(5,2) DEFAULT 0,
  overall_score DECIMAL(5,2) DEFAULT 0,
  certificate_tier TEXT CHECK (certificate_tier IN ('elite','confident','none')),
  intervention_flag TEXT DEFAULT 'none'
    CHECK (intervention_flag IN ('none','yellow','red','critical')),
  intervention_assigned_to UUID REFERENCES profiles(id),
  intervention_notes TEXT,
  refund_eligible BOOLEAN DEFAULT FALSE,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STUDENT ERRORS TABLE
CREATE TABLE IF NOT EXISTS student_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('anubhav','writing','quiz','shabd_shakti')),
  error_category TEXT CHECK (error_category IN ('mti','grammar','vocabulary','fluency','stress','structure')),
  error_subtype TEXT,
  error_word TEXT,
  correct_form TEXT,
  student_version TEXT,
  lesson_day INTEGER,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES enrollments(id),
  course_id TEXT DEFAULT 'aarambh',
  certificate_number TEXT UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('elite','confident')),
  transformation_score DECIMAL(5,2),
  fluency_score DECIMAL(5,2),
  mti_score DECIMAL(5,2),
  grammar_score DECIMAL(5,2),
  consistency_score DECIMAL(5,2),
  badges_earned TEXT[] DEFAULT '{}',
  photo_url TEXT,
  certificate_pdf_url TEXT,
  certificate_image_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, course_id)
);

-- 8. SHABD SHAKTI TABLES
CREATE TABLE IF NOT EXISTS shabd_shakti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INTEGER UNIQUE NOT NULL,
  word TEXT NOT NULL,
  pronunciation_guide TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  synonyms TEXT[] DEFAULT '{}',
  antonyms TEXT[] DEFAULT '{}',
  memory_trick TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shabd_shakti_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shabd_id UUID REFERENCES shabd_shakti(id),
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  quiz_attempts INTEGER DEFAULT 0,
  quiz_correct INTEGER DEFAULT 0,
  mastered BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, shabd_id)
);

-- 9. ENABLE RLS ON NEW TABLES
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shabd_shakti ENABLE ROW LEVEL SECURITY;
ALTER TABLE shabd_shakti_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

-- 10. RLS POLICIES - SELECT
CREATE POLICY "users_own_enrollment" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_scores" ON transformation_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_errors" ON student_errors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_certificates" ON certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_shabd_progress" ON shabd_shakti_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "all_auth_users_see_shabd" ON shabd_shakti FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_auth_users_see_weeks" ON weeks FOR SELECT USING (auth.role() = 'authenticated');

-- 11. INSERT/UPDATE policies for onboarding upserts
CREATE POLICY "users_insert_own_enrollment" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_enrollment" ON enrollments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_shabd_progress" ON shabd_shakti_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_shabd_progress" ON shabd_shakti_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_errors" ON student_errors FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles: need INSERT policy for the upsert in handleFinish
CREATE POLICY "users_insert_own_role" ON user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_role" ON user_roles FOR UPDATE USING (auth.uid() = user_id);
