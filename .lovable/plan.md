

# Anubhav Evaluate Edge Function — 3-Phase Overhaul

## Single file changed: `supabase/functions/anubhav-evaluate/index.ts`
## Database migrations needed for Phase 2 (3 new columns on `practice_sessions`, 3 on `lessons`)

---

## PHASE 1 — Critical Fixes (Changes 1–6)

### Change 1: World recordings only in Call 1 (lines 174-177)
Replace `allRecordings` to include ONLY `worldRecordings`. Remove `writingRecordings` from audio download array. Update Call 1 reference sentences (line 222) to use world recording sentences instead of `writtenSentences`.

### Change 2: Clean written sentences in Call 2 (lines 323-324)
Replace `"WRITING RECORDINGS"` JSON dump with a numbered plain-text list of sentences only (no audioPath). Label: `"WRITTEN SENTENCES"`. If empty → `"WRITTEN SENTENCES: None submitted this session."`

### Change 3: Remove max_tokens from Call 2 (line 403)
Delete `max_tokens: 1200` from the Call 2 fetch body. Keep it on Call 1 (line 276).

### Change 4: Update evaluate_practice tool schema (lines 382-397)
- Add `isCorrect` (boolean) and `correctedVersion` (string) to writingChecks item, all 5 fields required
- Add 5 new top-level properties: `grammar_score`, `completeness_score`, `writing_composite_score`, `ai_summary`, `coaching_focus`
- Update required array to include all 10 fields

### Change 5: Call 1 failure defaults → null (lines 208-212, 110-114)
- Change default scores from 50 to `null`
- Rename `audioEvalFailed` → `audioEvalSkipped`
- When `audioEvalSkipped`, replace scores block in Call 2 with `"SPEAKING EVALUATION: Audio unavailable this session."`
- Compute `compositeScore` only when scores are non-null; otherwise null
- Update `normalizeScore` fallback from 50 → null (but only used on Call 1 success path)
- Update fallback response scores from 50 → null

### Change 6: Handle missing activities gracefully
- If `worldRecordings` empty → skip Call 1, set `audioEvalSkipped = true`, all scores null, wordErrors = []
- If `writtenSentences` empty → include "None submitted" in Call 2, expect null writing scores back
- Neither activity → still run Call 2 for master message, never throw

---

## PHASE 2 — Schema Additions (Changes 7–10)

### Change 7: Lesson writing columns → Call 2
- **DB migration**: Add `gyani_transcript TEXT`, `gyanu_transcript TEXT`, `grammar_topics_summary TEXT` to `lessons` (Change 8 columns combined)
- Fetch `write_prompt, writing_prompt_type, write_sentence_count` from lessons query (these columns already exist in schema)
- Add to Call 2 user message if non-null

### Change 8: Transcript columns → Call 2
- **DB migration**: `gyani_transcript`, `gyanu_transcript` added to `lessons`
- Fetch and include in Call 2 if non-null

### Change 9: Writing score columns on practice_sessions
- **DB migration**: Add `grammar_score NUMERIC(5,2)`, `completeness_score NUMERIC(5,2)`, `writing_composite_score NUMERIC(5,2)` to `practice_sessions`
- Map from Gemini Call 2 output directly (no normalizeScore), store null if Gemini returns null

### Change 10: Activate anubhav_ai_log write-back
- After successful Call 2, insert into `anubhav_ai_log`: user_id, course_id, day_number, attempt_number, composite_score, ai_summary, coaching_focus

---

## PHASE 3 — Memory Loop (Changes 11–12)

### Change 11: Last 3 AI log entries → Call 2
- Query `anubhav_ai_log` (user, last 3 by created_at desc)
- Add formatted block to Call 2 user message after progress summary

### Change 12: Expand progressSummary in Call 2
- Query `student_progress` for full row
- Replace `JSON.stringify(progressSummary)` with formatted human-readable block including all non-null fields

---

## DB Migrations Required

**Migration 1** — Add columns to `lessons`:
```sql
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS gyani_transcript TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS gyanu_transcript TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS grammar_topics_summary TEXT;
```

**Migration 2** — Add columns to `practice_sessions`:
```sql
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS grammar_score NUMERIC(5,2);
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS completeness_score NUMERIC(5,2);
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS writing_composite_score NUMERIC(5,2);
```

Note: `write_prompt`, `writing_prompt_type`, `write_sentence_count` already exist on `lessons`.

---

## Build Sequence
1. Run both DB migrations
2. Rewrite edge function with all 12 changes in one pass (single file)
3. Confirm each phase's changes

