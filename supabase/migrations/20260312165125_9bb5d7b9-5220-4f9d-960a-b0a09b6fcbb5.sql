ALTER TABLE daily_flames
  ADD COLUMN IF NOT EXISTS tomorrows_intention TEXT,
  ADD COLUMN IF NOT EXISTS ai_response TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS elevenlabs_audio_url TEXT;