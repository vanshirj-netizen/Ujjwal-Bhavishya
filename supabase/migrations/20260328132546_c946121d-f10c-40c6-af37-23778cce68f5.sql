
-- Create daily_quotes table
CREATE TABLE public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number integer UNIQUE NOT NULL,
  quote_text text NOT NULL,
  quote_author text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read daily_quotes"
  ON public.daily_quotes FOR SELECT
  TO authenticated
  USING (true);

-- Seed row
INSERT INTO public.daily_quotes (day_number, quote_text, quote_author)
VALUES (1, 'It does not matter how slowly you go as long as you do not stop.', 'Confucius');

-- Create qod_responses cache table
CREATE TABLE public.qod_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_number integer NOT NULL,
  line_1 text,
  line_2 text,
  line_3 text,
  quote_text text,
  quote_author text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, day_number)
);

ALTER TABLE public.qod_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own qod_responses"
  ON public.qod_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own qod_responses"
  ON public.qod_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
