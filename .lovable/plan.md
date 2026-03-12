

# Fix Plan: Dashboard Day Cards + DayScreen Replay

## Files to modify
1. `src/pages/Dashboard.tsx` — Parts A, B, D, E
2. `src/pages/DayScreen.tsx` — Part C (replay logic)

No changes to Journey.tsx — it already uses `progressData?.filter(p => p.day_complete).length` for Days Active (line 57), which is correct.

## Dashboard.tsx Changes

**State additions:**
- `allProgress` array state to hold progress for all 60 days
- `allLessons` array state to hold lesson titles for the grid

**Data fetch additions (inside existing useEffect):**
- Fetch all user progress: `supabase.from("progress").select("day_number, day_complete, gamma_complete, gyani_complete, gyanu_complete, quiz_complete").eq("user_id", user.id)`
- Fetch all lesson titles: `supabase.from("lessons").select("day_number, title").eq("course_id", COURSE_ID)`
- Store in state

**displayDay guard:**
- `const displayDay = (enrollData?.current_day ?? 0) > 0 ? enrollData.current_day : 1;`
- Use `displayDay` everywhere instead of raw `current_day`

**60-Day Grid rewrite (lines 248-282):**
Replace the simple circle grid with rich day cards showing 3 states:
- **Completed**: gold checkmark badge, lesson title subtitle, "Completed ✦" label, clickable
- **In Progress**: pulsing dot badge, mini step dots, "Continue →" label, clickable
- **Locked/Upcoming**: dimmed, lock icon for free tier days 6+, upgrade toast on click; paid future days show "Upcoming" and are clickable

Helper: `getDayProgress(dayNum)` to look up progress from `allProgress` array.

**Aarambh course card progress:** Update hardcoded `"0/60"` to use `completedDays` value: `${completedDays}/60`

## DayScreen.tsx Changes

**New state:** `isReplay` (boolean, default false)

**Step 6 screen additions:**
- Add "↺ Replay Day {dayNumber}" button after the "← Back to Home" link
- On click: `setIsReplay(true); setCurrentStep(1); setCompletedSteps([]);`

**New function `replayCompleteDay`:**
- Validates quizScore
- Updates ONLY `quiz_score` and `updated_at` in progress table
- Does NOT touch enrollment, streak, or current_day
- On success: `setIsReplay(false); setCurrentStep(6); setCompletedSteps([1,2,3,4,5]);`

**Step 5 button config (line 335):**
- Change label: `isReplay ? "Update My Score ✦" : "Submit & Complete Day 🔥"`
- Change onClick: `isReplay ? replayCompleteDay : completeDay`

**Resume logic (line 168):** Already sets step 6 correctly for completed days — no change needed, just ensure `setIsReplay(false)` is added there.

## Technical details
- All new Supabase calls wrapped in existing try/catch blocks
- No new packages
- Grid changes from `grid-cols-6` circles to `grid-cols-2 sm:grid-cols-3` cards using existing `glass-card` class
- Replay never increments streak or changes current_day

