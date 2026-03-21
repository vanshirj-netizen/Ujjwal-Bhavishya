

# Anubhav + Flame Critical Overhaul

Three files changed. No other files touched.

---

## PART 1 — Edge Function: `supabase/functions/anubhav-evaluate/index.ts` (Full rewrite)

### 1A. Remove ANUBHAV_MASTER_PROMPT crash
Lines 38, 47-53 check for a secret that doesn't exist → 500 on every call. Remove entirely. Also remove duplicate dangling code at lines 598-600 (syntax error from prior edit).

### 1B. Fetch personality from DB
After auth, parse request body for: `masterName, firstName, userId, courseId, dayNumber, attemptNumber, selectedWorld, writingRecordings, worldRecordings, sessionHistory, progressSummary, lessonTitle, grammarPattern, mtiZone, motherTongue`.

Fetch from `ai_personalities` table where `master_name = masterName` and `context = 'anubhav'`. Fallback to generic prompt.

### 1C. Restructure audio processing
Current code downloads from `audio_sentences_path` / `audio_freespeech_path` — these columns don't exist in the schema. Replace with:
- Iterate `writingRecordings[]` and `worldRecordings[]` arrays (each has an `audioPath`)
- Download each audio file from storage
- Send all audio parts + written text to Gemini as multimodal content

### 1D. Two Gemini calls → structured response
**Call 1 (Audio eval):** Keep existing Gemini audio eval structure but adapt to multiple audio files from the arrays. Returns scores + word errors.

**Call 2 (Feedback):** Use fetched personality prompt as system message. Build user prompt with full context (student info, scores, history, progress). Request JSON response with: `mastermessage`, `mastermessagevoice`, `topErrorSummary`, `wordErrors` (with word/heardAs/correction/example), `writingChecks` (sentence/issue/fix).

### 1E. ElevenLabs voice generation
Strip voice cues from `mastermessagevoice` (replace `[PAUSE]` → `...`, remove `[SOFT]`, `[WARM]`, etc.). Send cleaned text to ElevenLabs. Upload resulting MP3 to `anubhav-audio` bucket at `{userId}/{dayNumber}/master_{attemptNumber}.mp3`. Get public URL.

### 1F. Database saves
- UPDATE `practice_sessions` with all scores, `master_message`, `master_message_voice`, `master_message_audio_url`, `top_error_summary`, `word_errors`, `writing_checks`, `status: 'complete'`
- UPDATE `is_best_attempt` logic (reset all → set highest score)
- UPSERT `progress` table: `anubhav_complete = true`
- UPSERT `student_progress` (keep existing logic)

### 1G. Error safety
Wrap entire body in try/catch. On ANY error: still save `status: 'complete'` + `anubhav_complete: true`, return HTTP 200 with fallback scores (50/50/50/50).

### 1H. Return schema
```json
{
  "wordClarityScore", "smoothnessScore", "naturalSoundScore", "compositeScore",
  "mastermessage", "mastermessagevoice", "mastermessageaudiourl",
  "topErrorSummary", "wordErrors", "writingChecks"
}
```

---

## PART 2 — `src/pages/AnubhavPage.tsx`

### 2A. Session retry count (IST cutoff)
Add `getTodayISTCutoff()` helper (handles pre-5:30 AM rollback). Add state: `todaySessionsCount`, `thisSessionEverDone`. Query global session count today (all days) with `.gte('submitted_at', cutoff)`. On error → default 0, never block.

Display logic:
- `>= 3` → rest message screen with "Back to Home"
- `< 3 && ever done` → "Replay Practice (X of 3 left)"
- `< 3 && never done` → "Start Practice"

### 2B. Audio architecture → individual uploads
Replace blob-combining logic in `submitForEvaluation()`. Instead, upload each recorded blob individually during the speak phase (on "Next" tap):
- Writing recordings: `{userId}/{dayNumber}/writing_{index}_attempt{N}.webm`
- World recordings: `{userId}/{dayNumber}/world_{index}_attempt{N}.webm`

Build `writingRecordings[]` and `worldRecordings[]` JSONB arrays with sentence text + audio path.

### 2C. Payload to anubhav-evaluate
Replace current fetch body with new schema including: `masterName, firstName, courseId, attemptNumber, selectedWorld, mtiZone, motherTongue, lessonTitle, grammarPattern, writingRecordings, worldRecordings, sessionHistory, progressSummary`.

Add data fetches for `sessionHistory` (last 5 completed sessions) and `progressSummary` (from student_progress table).

### 2D. Profile query
Add `chosen_world` to the select (already has `mti_zone, mother_tongue`).

### 2E. Results screen updates
- Replace `results.ai_feedback` → `results.mastermessage`
- Replace "Hear Master Say This" → "Hear it from {masterName}" using `results.mastermessageaudiourl` (fallback to generate-flame-voice)
- Word errors: display `heardAs`, `correction` (UB Pronunciation Code), and `example` sentence
- Writing checks: use `issue` and `fix` fields from new schema

### 2F. Playback button
Already exists (audio element at line 668). Keep as-is — it works.

---

## PART 3 — `src/pages/FlamePage.tsx`

### 3A. Profile query
Add `mother_tongue, mti_zone` to select (line 79).

### 3B. Practice session query
Add `composite_score, master_message_audio_url` to select (line 83).

### 3C. Progress summary fetch
Add query to `student_progress` table in fetchData. Store in state.

### 3D. Payload to generate-flame-response
Fix broken payload:
- `studentName` → first name only (split on space)
- Add `compositeScore` from practice session
- Add `feltScore: confRating * 20` (0-100)
- `streakCount` → from profile directly, not state
- Add `motherTongue, mtiZone, progressSummary`

### 3E. Store master_message_voice
After AI response returns, save `master_message_voice` to `reflection_sessions` alongside `ai_response`.

### 3F. Audio playback
In read-only mode: if `elevenlabs_audio_url` exists → play directly. Only call generate-flame-voice if null. (Already works this way — verify and keep.)

### 3G. Streak calculation
Current `calculateStreak` uses `day_number` gaps (wrong). Replace with calendar-date streak from `practice_sessions.submitted_at` converted to IST dates, walking backwards from today.

---

## Technical Details

**DB columns confirmed in schema:**
- `practice_sessions`: `master_message`, `master_message_voice`, `master_message_audio_url`, `writing_recordings` (jsonb), `world_recordings` (jsonb), `word_errors` (jsonb), `writing_checks` (jsonb)
- `reflection_sessions`: `master_message_voice`, `elevenlabs_audio_url`

**Columns NOT in schema** (must stop referencing):
- `audio_sentences_path`, `audio_freespeech_path`, `transcript_sentences`, `transcript_freespeech`, `azure_word_errors`, `ai_feedback`

**Voice cue stripping regex:**
`[PAUSE]` → `...`, `[LONG PAUSE]` → `...`, `[BEAT]` → `.`, remove: `[SIGH]`, `[SOFT]`, `[WARM]`, `[SLOW]`, `[DIRECT]`, `[DRY]`, `[MIC DROP]`

