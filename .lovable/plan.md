# Bug Fix: "Max practice reached" showing incorrectly

## Root Cause

The current code in `DayScreen.tsx` (lines 121-131) queries `practice_sessions` for the highest `attempt_number` for **this specific day_number** with **no date filter**. So if a student practiced Day 1 three times **yesterday**, `attempt_number = 3` is returned today, and the UI shows "Max practice reached for today" even though they haven't practiced at all today.

Two problems:

1. **No date filter** — it reads lifetime attempts, not today's
2. **Per-day instead of global** — the 3-attempt limit is shared across ALL lesson days per calendar day, but the query only checks one day_number

## Fix (single file: `src/pages/DayScreen.tsx`)

### Replace the attempt-tracking state and query (lines 111-133)

**New state:**

- `todaySessionsCount: number` (0 by default — never blocks on failure)
- `thisDayHasSession: boolean` (whether this specific day has any completed session ever — for showing "Start" vs "Replay")
- `practiceDataLoading: boolean`

**New query logic:**

1. Count ALL completed sessions today across all days using `getTodayISTCutoff()`:
  ```
   supabase.from('practice_sessions')
     .select('*', { count: 'exact', head: true })
     .eq('user_id', userId)
     .eq('status', 'complete')
     .gte('submitted_at', cutoff)
  ```
   On error → default to 0 (allow practice)
2. Check if this specific day has ANY completed session (no date filter):
  ```
   supabase.from('practice_sessions')
     .select('id')
     .eq('user_id', userId)
     .eq('day_number', dayNumber)
     .eq('status', 'complete')
     .limit(1)
  ```

**Add helper function** `getTodayISTCutoff()`:

- Gets current time in IST
- If IST hour < 5 (or hour=5 and min<30), the "today" is actually yesterday's 5:30 AM
- Returns the UTC ISO string for 5:30 AM IST of the current reset day
- Formula: today's date in IST at 05:30 = `Date.UTC(year, month, date, 0, 0, 0)` (since 5:30 AM IST = 00:00 UTC)

### Update the display logic (lines 331, 354-400)

Replace `practiceAttemptNum` logic with:

- `todaySessionsCount >= 3` → show "Max practice reached"
- `todaySessionsCount < 3 && thisDayHasSession` → show "Replay Practice · {todaySessionsCount} of 3 used today"
- `todaySessionsCount < 3 && !thisDayHasSession` → show "Start Your Practice" card
- `todaySessionsCount === 0 && !thisDayHasSession` → also show "Back to Home" button below

### Files changed

Only `src/pages/DayScreen.tsx`  
  
**Fix approved. One addition needed:**  
**In the todaySessionsCount query, add:**  
**.eq('course_id', courseId)**  
**after .eq('user_id', userId)**  
  
**This future-proofs the limit when **  
**multiple courses exist. No other changes.**