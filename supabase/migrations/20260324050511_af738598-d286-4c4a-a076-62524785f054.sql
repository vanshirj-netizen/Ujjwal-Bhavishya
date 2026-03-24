-- FIX 1: Prevent payment bypass via self-insert on enrollments
CREATE OR REPLACE FUNCTION public.enforce_free_enrollment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.payment_status := 'free';
  NEW.payment_mode := NULL;
  NEW.paid_at := NULL;
  NEW.payment_amount := NULL;
  NEW.razorpay_payment_id := NULL;
  NEW.razorpay_order_id := NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_free_enrollment
  BEFORE INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_enrollment();

-- FIX 3: Drop overly permissive policy on student_progress
DROP POLICY IF EXISTS "Service role can do everything" ON public.student_progress;

-- FIX 4: Enable RLS on ai_personalities
ALTER TABLE public.ai_personalities ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read ai_personalities (needed by edge functions via service role, and public read for personality display)
CREATE POLICY "Anyone can read personalities"
  ON public.ai_personalities
  FOR SELECT
  TO public
  USING (true);