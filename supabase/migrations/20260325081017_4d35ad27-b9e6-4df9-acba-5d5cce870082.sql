ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS grammar_score NUMERIC(5,2);
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS completeness_score NUMERIC(5,2);
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS writing_composite_score NUMERIC(5,2);