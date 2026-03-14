

# Anubhav 2.0 Complete Overhaul — Implementation Plan

## Important Note
The prompt references `master_name` from profiles but the actual column is `selected_master`. All code will use `selected_master` consistently.

## Database
No schema changes needed. `anubhav_writings` and `anubhav_practice_sessions` tables already exist with all required columns (`transcript_sentences`, `transcript_freespeech`, `audio_sentences_path`, `audio_freespeech_path`, `word_clarity_score`, `smoothness_score`, `natural_sound_score`, `azure_word_errors`, `ai_feedback`, `top_error_summary`, `writing_id`, `status`, `submitted_at`, `retry_count`).

## New Files

### 1. `src/hooks/useAudioRecorder.ts`
Custom hook replacing all Web Speech API usage. Uses MediaRecorder API with iOS detection (`audio/mp4` on iOS, `audio/webm;codecs=opus` elsewhere). Returns `isRecording`, `startRecording`, `stopRecording`, `audioBlob`, `audioURL`, `durationSeconds`, `error`. Handles permission denied with user-friendly message.

### 2. `src/components/AudioRecorderButton.tsx`
Reusable component with props: `onRecordingComplete(blob, duration)`, `minDurationSeconds`, `maxDurationSeconds`, `promptText`, `showWaveform`. Features:
- Large pulsing red mic button while recording
- 5-bar CSS waveform animation
- MM:SS timer counting up
- Min duration enforcement ("Keep speaking... X seconds to go")
- Max duration auto-stop
- Post-recording: audio playback bar + "Use this" / "Record again" buttons

### 3. `supabase/functions/anubhav-evaluate/index.ts`
New edge function with JWT auth. Steps:
- **A**: Fetch writings from `anubhav_writings`, audio paths from `anubhav_practice_sessions`, download audio from `anubhav-audio` bucket using service role key
- **B**: Azure Pronunciation Assessment on both audio files. Extract word_clarity (AccuracyScore), smoothness (FluencyScore), natural_sound (ProsodyScore), transcripts, word errors. Average scores across both files. Translate ErrorType to plain English. Max 5 errors.
- **C**: Gemini feedback via Lovable AI gateway using `ANUBHAV_MASTER_PROMPT` env var as system prompt. Returns JSON with `feedback`, `writing_checks[]`, `top_error_summary`.
- **D**: Update `anubhav_practice_sessions` with all results.
- **E**: Return scores, errors, writing_checks, feedback to frontend.
- Register in `supabase/config.toml` with `verify_jwt = false`.

## Modified Files

### 4. `src/pages/AnubhavPage.tsx` — Complete Rewrite
New 3-phase flow with phase indicator (Write → Speak → Results):

**Phase 1 (Write)**: Fetch lesson data via enrollments→lessons join. Show `write_sentence_count` numbered inputs with `grammar_hint` card. Save to `anubhav_writings`, create `anubhav_practice_sessions` record. Advance to Phase 2.

**Phase 2 Step 1 (Speak Sentences)**: Show written sentences for 5s with countdown, then fade. Use `AudioRecorderButton` with lesson's `speak_min_seconds`/`speak_max_seconds`. Upload to `anubhav-audio` bucket. Update session record.

**Phase 2 Step 2 (Free Speaking)**: `AudioRecorderButton` with min=120s, max=300s. Show `free_speak_context` from lessons. Upload to bucket. Show "Submit for Evaluation" button.

**Evaluation Loading**: Full-screen with UB logo pulse, cycling text every 4s. Calls `anubhav-evaluate` edge function with JWT.

**Phase 3 (Results)**: 3 score cards (Word Clarity, Smoothness, Natural Sound) with animated progress bars (red/amber/green). Writing check section. "Let's Fix This" cards (max 2, plain English only — banned words list enforced). Master feedback card with "Hear masterName" voice button. "Retry Speaking" and "Done for Today" buttons (Done updates `progress.anubhav_complete = true`, toasts, redirects to dashboard).

Remove all SpeechRecognition code, old world-type selector, old sentence-by-sentence flow, quick flame section.

### 5. `src/pages/FlamePage.tsx` — Gate + Redesign
Add gate check on mount: query `progress` for `anubhav_complete` for current day/user. If false, show lock screen with "Go to Practice" button.

When unlocked, 3-screen flow:
- **Screen 1**: Confidence rating (5 stars)
- **Screen 2**: Call `generate-flame-response` with JWT + scores from `anubhav_practice_sessions`. Show master celebration card + voice button.
- **Screen 3**: Streak celebration. "Complete Day" button sets `flame_complete = true, day_complete = true` in progress, updates `daily_flames`, redirects to dashboard.

### 6. `src/pages/Dashboard.tsx` — 3-Phase Day Indicators
Update day cards to show 3 phase icons (📖 Lesson, 🎤 Practice, 🔥 Flame) with states:
- Grey+lock: previous phase incomplete
- Outlined: unlocked but not done
- Filled+bright: complete

Fetch `lesson_complete`, `anubhav_complete`, `flame_complete` from progress. Today's card gets glow + "TODAY" label. Progress bar at top: `{completedDays} / 60 Days Complete`.

### 7. All Edge Functions — JWT Auth
Add to `anubhav-coach`, `generate-flame-response`, `generate-flame-voice`, and new `anubhav-evaluate`:
- Extract `Authorization` header, verify `Bearer` prefix
- Create Supabase client with auth header, call `getUser(token)` or `getClaims(token)`
- Return 401 if invalid
- Frontend: get session token via `supabase.auth.getSession()`, pass as `Authorization: Bearer ${token}` header

### 8. `supabase/functions/generate-flame-response/index.ts`
Add JWT check. Update to accept Anubhav scores (`word_clarity_score`, `smoothness_score`, `natural_sound_score`, `top_error_summary`, `streak_count`) in request body. Read system prompt from `FLAME_MASTER_PROMPT` env var.

### 9. `src/pages/DayScreen.tsx`
Update celebration screen (step 6): Remove the Anubhav card link. Keep the Flame card. The flow is now: Learn (DayScreen) → Practice (AnubhavPage) → Flame (FlamePage). The DayScreen celebration should direct to Anubhav first, not Flame.

### 10. `supabase/config.toml`
Add `[functions.anubhav-evaluate]` with `verify_jwt = false`.

## Do NOT Touch
- `src/pages/FlameRedirect.tsx` (Progress Sanctuary)
- `src/pages/Journey.tsx` (60-Day Road Map)
- Certificate flow
- Login/signup pages
- `anubhav_attempts`, `anubhav_sessions`, `shabd_shakti`, `shabd_shakti_progress` tables
- Existing table structures
- App styling/colors/fonts

## Execution Order
1. Create `useAudioRecorder` hook + `AudioRecorderButton` component
2. Create `anubhav-evaluate` edge function + update config.toml
3. Add JWT to all edge functions
4. Update `generate-flame-response` with new params
5. Rewrite `AnubhavPage.tsx`
6. Update `FlamePage.tsx` (gate + redesign)
7. Update `Dashboard.tsx` (3-phase indicators)
8. Update `DayScreen.tsx` (celebration screen adjustments)

