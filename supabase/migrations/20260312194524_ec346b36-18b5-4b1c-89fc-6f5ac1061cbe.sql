
CREATE TABLE public.anubhav_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  world_type TEXT NOT NULL,
  sentence_index INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  total_attempted INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.anubhav_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own anubhav_sessions"
ON public.anubhav_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.anubhav_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.anubhav_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  sentence TEXT NOT NULL,
  student_response TEXT NOT NULL,
  ai_feedback TEXT,
  mti_target TEXT,
  was_correct BOOLEAN DEFAULT false,
  score_awarded INTEGER DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.anubhav_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own anubhav_attempts"
ON public.anubhav_attempts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
