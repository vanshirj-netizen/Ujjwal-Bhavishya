-- Add INSERT policy for profiles so handle_new_user and app can insert
CREATE POLICY "users_insert_own_profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Insert missing profile for Vansh
INSERT INTO public.profiles (id, full_name, email, current_streak, ub_student_id, onboarding_complete)
VALUES (
  'f5169821-532e-44f7-aacb-3d70366f261d',
  'Vansh Jha',
  'vanshirj@gmail.com',
  2,
  generate_ub_student_id(),
  true
)
ON CONFLICT (id) DO NOTHING;

-- Insert missing enrollment for Vansh
INSERT INTO public.enrollments (user_id, current_day, days_completed, is_active, payment_status)
VALUES (
  'f5169821-532e-44f7-aacb-3d70366f261d',
  3,
  2,
  true,
  'free'
)
ON CONFLICT DO NOTHING;

-- Insert missing user_role for Vansh
INSERT INTO public.user_roles (user_id, role)
VALUES ('f5169821-532e-44f7-aacb-3d70366f261d', 'student')
ON CONFLICT (user_id, role) DO NOTHING;