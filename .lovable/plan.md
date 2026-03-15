

# Combined Fix & Redesign Plan

## Prompt 1 — Storage RLS Policies

Add two storage RLS policies for `anubhav-audio` bucket via migration:
- **INSERT**: `(storage.foldername(name))[1] = auth.uid()::text` for authenticated users
- **SELECT**: `(storage.foldername(name))[1] = auth.uid()::text` for authenticated users

## Prompt 2 — Security Fixes

**Fix 1 — user_roles**: Drop `users_insert_own_role` and `users_update_own_role` policies. Keep only the two SELECT policies.

**Fix 2 — enrollments**: Drop `users_update_own_enrollment`. Create new restricted UPDATE policy that uses a WITH CHECK preventing modification of payment columns. Use a BEFORE UPDATE trigger that copies old values for protected columns (`payment_status`, `razorpay_payment_id`, `razorpay_order_id`, `razorpay_refund_id`, `refund_reason`, `paid_at`, `refund_initiated_at`, `refund_completed_at`) — this is more reliable than RLS for column-level restrictions.

**Fix 3 — profiles**: Create a BEFORE UPDATE trigger on profiles that prevents users from changing `payment_status` by always resetting it to the old value.

## Prompt 3 — Bug Fixes & Flame Redesign

### BUG FIX 1 — Anubhav lesson fetch
Already working correctly — the code at lines 67-89 fetches from enrollments then lessons. The `course_id` in enrollments is a text field (`'aarambh'`) but `lessons.course_id` is a UUID. This mismatch means the query returns null and generic fallbacks show. **Fix**: Query lessons by `day_number` only (without filtering by `course_id`) since there's only one course. Or better: fetch the lesson matching just `day_number` as primary filter.

### BUG FIX 2 — Audio upload path
Already correct — path is `${user.id}/${dayNumber}/filename.ext` which matches `(storage.foldername(name))[1] = auth.uid()`. No code change needed once storage policies are added.

### BUG FIX 3 — DayScreen celebration (step 6)
In `DayScreen.tsx` lines 314-391, remove:
- "Your Daily Flame is Ready" card (lines 336-345)
- "Up Next" card (lines 356-367)
Reorder: Practice card first, then Replay button, then Back to Home.

### BUG FIX 4 — Dashboard day locking
In `Dashboard.tsx` lines 335-398, the 60-day map currently only locks days >5 for free users. Add sequential lock logic: a day is locked unless previous day has `flame_complete = true`. Only Day 1 is always unlocked. Locked days show lock icon and toast on tap.

### BUG FIX 5 — FlameRedirect chart
In `FlameRedirect.tsx` lines 52-72, change query from `anubhav_sessions` to `anubhav_practice_sessions`. Use `word_clarity_score`, `smoothness_score`, `natural_sound_score` instead of `score/total_attempted`. Calculate chart score as average of 3 scores.

### FLAME REDESIGN

**AnubhavPage results screen** (lines 627-641):
- Replace "Done for Today ✦" button with "Light Your Flame 🔥"
- On click: set `anubhav_complete = true` in progress, then navigate to `/flame/${dayNumber}`

**FlamePage complete rewrite** — 4 states:
1. **Read-only memory** (when `flame_complete` already true): Show saved reflection answers, confidence stars, Anubhav scores, AI response card, "Hear masterName Again" button playing saved `elevenlabs_audio_url`
2. **Gate** (anubhav not complete): Lock screen with "Go to Practice"
3. **Screen 1 — Reflection**: 4 inputs (confidence stars, spoke_about, biggest_challenge, tomorrows_intention) with character counters. Save to `daily_flames` on Continue.
4. **Screen 2 — Master Summary**: Loading state with cycling text. Call `generate-flame-response` with all reflection data + Anubhav scores + written sentences. Show response card + voice button. Save `ai_response` and `elevenlabs_audio_url` to `daily_flames`.
5. **Screen 3 — Streak**: Animated flame, streak count, milestone messages. Complete Day button sets `flame_complete = true, day_complete = true`.

**generate-flame-response edge function**: Add `spoke_about`, `biggest_challenge`, `tomorrows_intention`, `written_sentences` to accepted body. Use `FLAME_MASTER_PROMPT` env var as system prompt. Include all reflection + Anubhav data in context.

## Files Changed

1. **Migration SQL** — Storage policies + security policy changes (3 items)
2. `src/pages/AnubhavPage.tsx` — Fix lesson fetch (remove course_id filter), change "Done" → "Light Your Flame"
3. `src/pages/DayScreen.tsx` — Remove Flame card and Up Next card from celebration
4. `src/pages/Dashboard.tsx` — Add sequential day locking
5. `src/pages/FlameRedirect.tsx` — Fix chart to use `anubhav_practice_sessions`
6. `src/pages/FlamePage.tsx` — Complete rewrite with reflection flow + read-only memory
7. `supabase/functions/generate-flame-response/index.ts` — Accept new fields, use FLAME_MASTER_PROMPT

