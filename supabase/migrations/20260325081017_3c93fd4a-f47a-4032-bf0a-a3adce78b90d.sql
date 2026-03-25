ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS gyani_transcript TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS gyanu_transcript TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS grammar_topics_summary TEXT;