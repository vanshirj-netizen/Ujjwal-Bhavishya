
-- PROMPT 1: Storage RLS policies for anubhav-audio bucket
CREATE POLICY "Users upload own audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'anubhav-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users read own audio"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'anubhav-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- PROMPT 2 Fix 1: Remove dangerous user_roles INSERT/UPDATE policies
DROP POLICY IF EXISTS "users_insert_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "users_update_own_role" ON public.user_roles;

-- PROMPT 2 Fix 2: Enrollments - protect payment columns via trigger
DROP POLICY IF EXISTS "users_update_own_enrollment" ON public.enrollments;

CREATE POLICY "users_update_own_enrollment_restricted"
ON public.enrollments FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.protect_enrollment_payment_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.payment_status := OLD.payment_status;
  NEW.razorpay_payment_id := OLD.razorpay_payment_id;
  NEW.razorpay_order_id := OLD.razorpay_order_id;
  NEW.razorpay_refund_id := OLD.razorpay_refund_id;
  NEW.refund_reason := OLD.refund_reason;
  NEW.paid_at := OLD.paid_at;
  NEW.refund_initiated_at := OLD.refund_initiated_at;
  NEW.refund_completed_at := OLD.refund_completed_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_enrollment_payment_cols
BEFORE UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.protect_enrollment_payment_columns();

-- PROMPT 2 Fix 3: Profiles - protect payment_status via trigger
CREATE OR REPLACE FUNCTION public.protect_profile_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.payment_status := OLD.payment_status;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_payment_status
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_payment_status();
