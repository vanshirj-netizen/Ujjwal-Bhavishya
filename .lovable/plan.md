

# Build Daily Flame Feature

## Secrets Required

Before implementation, we need 3 secrets:
- **ELEVENLABS_API_KEY** — for voice synthesis
- **GYANI_VOICE_ID** — ElevenLabs voice ID for the Gyani master
- **GYANU_VOICE_ID** — ElevenLabs voice ID for the Gyanu master

The AI response will use **Lovable AI gateway** (already configured via `LOVABLE_API_KEY`) instead of calling Gemini directly. This removes the need for a separate Gemini API key and is the recommended approach.

## Database Migration

Add 4 columns to `daily_flames`:
- `tomorrows_intention TEXT`
- `ai_response TEXT`
- `ai_generated_at TIMESTAMPTZ`
- `elevenlabs_audio_url TEXT`

## Edge Function 1: `generate-flame-response`

- Receives student reflection data (name, day, lesson, spoke about, challenge, intention, master, confidence)
- Calls Lovable AI gateway with the coach persona prompt
- Returns `{ aiResponse: string }`
- Fallback: always returns an encouraging message, never an error

## Edge Function 2: `generate-flame-voice`

- Receives `{ text, masterName }`
- Calls ElevenLabs TTS API with the appropriate voice ID
- Returns `{ audioBase64, mimeType }` or `{ audioBase64: null }` on failure
- Uses `base64Encode` from Deno std library (not `btoa` with spread)

## New File: `src/pages/FlamePage.tsx`

6-screen guided reflection flow:
1. **What did you speak about?** — suggestion chips + textarea
2. **Biggest challenge** — 5 option cards (pronunciation, vocabulary, confidence, grammar, custom)
3. **Tomorrow's intention** — chips + textarea + motivational quote
4. **Generating** — loading animation with pulsing flame
5. **AI Response** — gold-bordered card with play voice button (ElevenLabs + browser TTS fallback)
6. **Flame is Lit** — celebration with particles, streak display, reflection cards, WhatsApp share

Existing flame data detection: if already submitted for this day, skip to Screen 6 with saved data.

## Route Update: `App.tsx`

Replace the inline placeholder at `/flame/:dayNumber` with `<FlamePage />` import. Also update `supabase/config.toml` to register both edge functions with `verify_jwt = false`.

## Files Modified
1. SQL migration (new columns)
2. `supabase/functions/generate-flame-response/index.ts` (new)
3. `supabase/functions/generate-flame-voice/index.ts` (new)
4. `src/pages/FlamePage.tsx` (new)
5. `src/App.tsx` (route update)
6. `supabase/config.toml` (edge function config)

