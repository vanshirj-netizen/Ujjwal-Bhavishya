-- 1. ai_personalities: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can read personalities" ON public.ai_personalities;
CREATE POLICY "Authenticated users read personalities"
  ON public.ai_personalities
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. lessons: restrict to authenticated users with paywall enforcement
DROP POLICY IF EXISTS "Anyone reads lessons" ON public.lessons;
CREATE POLICY "Authenticated users read lessons"
  ON public.lessons
  FOR SELECT
  TO authenticated
  USING (
    day_number <= 5
    OR EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.user_id = auth.uid()
        AND enrollments.payment_status = 'paid'
        AND enrollments.is_active = true
    )
  );

-- 3. practice_sentences: restrict to authenticated users with paywall enforcement
DROP POLICY IF EXISTS "Public read sentences" ON public.practice_sentences;
CREATE POLICY "Authenticated users read sentences"
  ON public.practice_sentences
  FOR SELECT
  TO authenticated
  USING (
    lesson_day <= 5
    OR EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.user_id = auth.uid()
        AND enrollments.payment_status = 'paid'
        AND enrollments.is_active = true
    )
  );

-- 4. user_roles: explicit deny for INSERT and UPDATE from clients
CREATE POLICY "deny_client_role_insert"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "deny_client_role_update"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (false);

-- 5. enrollments: explicit deny UPDATE and DELETE from clients
CREATE POLICY "deny_client_enrollment_update"
  ON public.enrollments
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "deny_client_enrollment_delete"
  ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (false);