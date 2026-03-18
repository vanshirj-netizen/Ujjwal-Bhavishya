

# Edge Function: Save composite_score, attempt_number, and is_best_attempt

## Changes (single file: `supabase/functions/anubhav-evaluate/index.ts`)

### 1. Accept `attempt_number` from payload (line 76)
Add `attempt_number` to destructured request body, default to 1:
```ts
const { session_id, writing_id, master_name, lesson_topic, mti_zone, attempt_number } = await req.json();
const attemptNumber = attempt_number ?? 1;
```

### 2. Calculate composite_score before DB save (before line 433)
```ts
const compositeScore = Math.round(
  (avgWordClarity * 0.4) + (avgSmoothness * 0.35) + (avgNaturalSound * 0.25)
);
```

### 3. Add fields to the UPDATE payload (lines 433-444)
Add `composite_score: compositeScore` and `attempt_number: attemptNumber` to the existing `.update({...})` call.

### 4. Update is_best_attempt after save (after line 444)
Using `supabaseAdmin` (service role), run two sequential updates:
```ts
// Reset all attempts for this user+day
await supabaseAdmin.from("anubhav_practice_sessions")
  .update({ is_best_attempt: false })
  .eq("user_id", userId)
  .eq("day_number", session.day_number)
  .eq("status", "complete");

// Find best attempt and mark it
const { data: bestAttempt } = await supabaseAdmin
  .from("anubhav_practice_sessions")
  .select("id")
  .eq("user_id", userId)
  .eq("day_number", session.day_number)
  .eq("status", "complete")
  .not("composite_score", "is", null)
  .order("composite_score", { ascending: false })
  .order("submitted_at", { ascending: false })
  .limit(1)
  .single();

if (bestAttempt) {
  await supabaseAdmin.from("anubhav_practice_sessions")
    .update({ is_best_attempt: true })
    .eq("id", bestAttempt.id);
}
```

### 5. Add composite_score to response (line 448)
Add `composite_score: compositeScore` to the success JSON response.

### 6. Add composite_score to fallback error response (line 464)
Add `composite_score: 50` to the catch-block fallback response.

---

**File changed:** `supabase/functions/anubhav-evaluate/index.ts`

No database migration needed — `composite_score`, `attempt_number`, and `is_best_attempt` columns already exist on `anubhav_practice_sessions`.

