
-- Step 1: Drop the current broad UPDATE policy
DROP POLICY IF EXISTS "users_update_own_safe_columns" ON enrollments;

-- Step 2: Create SECURITY DEFINER function for safe updates only
CREATE OR REPLACE FUNCTION public.update_own_enrollment_safe(
  p_enrollment_id uuid,
  p_trial_completed boolean DEFAULT NULL,
  p_current_day integer DEFAULT NULL,
  p_days_completed integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM enrollments 
    WHERE id = p_enrollment_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: enrollment does not belong to current user';
  END IF;

  UPDATE enrollments SET
    trial_completed = COALESCE(p_trial_completed, trial_completed),
    current_day = COALESCE(p_current_day, current_day),
    days_completed = COALESCE(p_days_completed, days_completed)
  WHERE id = p_enrollment_id
  AND user_id = auth.uid();
END;
$$;

-- Step 3: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.update_own_enrollment_safe FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_enrollment_safe TO authenticated;
