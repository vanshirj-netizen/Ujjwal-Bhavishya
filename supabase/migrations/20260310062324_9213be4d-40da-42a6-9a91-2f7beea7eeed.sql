
-- Add description column to courses if not exists
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Add lesson_id and course_id to progress if not exists
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id);
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id);
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS master_watched boolean DEFAULT false;
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS quiz_score integer DEFAULT 0;

-- Add flame_date to daily_flames if not exists
ALTER TABLE public.daily_flames ADD COLUMN IF NOT EXISTS flame_date date DEFAULT CURRENT_DATE;

-- Ensure unique constraint on user_roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;
