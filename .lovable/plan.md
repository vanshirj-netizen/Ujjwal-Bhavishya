# Comprehensive App Overhaul — 13-Part Implementation Plan

This is a very large change spanning table renames, navigation, 3 new/redesigned tabs, edge function rewrites, streak logic fixes, and chart deduplication. Below is the consolidated implementation plan.

---

## PART 1 — Table Reference Updates

Search-and-replace across all `.tsx` and `.ts` files (excluding `types.ts` which is auto-generated):


| Old Name                    | New Name                   | Files Affected                                                                  |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `anubhav_practice_sessions` | `practice_sessions`        | AnubhavPage, DayScreen, FlamePage, FlameRedirect, anubhav-evaluate              |
| `anubhav_writings`          | `writing_submissions`      | AnubhavPage, FlamePage, anubhav-evaluate                                        |
| `daily_flames`              | `reflection_sessions`      | Dashboard, Profile, Journey, FlamePage, FlameRedirect, AnubhavPage, userContext |
| `student_errors`            | `practice_errors`          | userContext (saveSessionSummary + fetchFreshUserContext)                        |
| `training_plan`             | `student_training_plans`   | userContext (saveSessionSummary + fetchFreshUserContext)                        |
| `"weeks"`                   | `"course_weeks"`           | Journey                                                                         |
| `learning_sessions`         | `legacy_learning_sessions` | userContext (saveSessionSummary)                                                |


**Note**: The `types.ts` file is auto-generated and must NOT be edited. The actual DB tables already use the new names (confirmed from schema). The old names in code are bugs.

---

## PART 2 — Navigation Redesign

### BottomNav.tsx — 5 tabs

Replace 4-tab nav with 5 tabs using Lucide icons:

- Home → `Home` icon
- Journey → `Compass` icon  
- Anubhav → `Dumbbell` icon → `/anubhav-hub`
- Flame → `Flame` icon → `/flame`
- Profile → `Sparkles` icon

### New: CourseSwitcher component

Create `src/components/CourseSwitcher.tsx`:

- Gold-bordered pill showing "AARAMBH ▾"
- On tap: modal with 4 courses (only Aarambh active, rest locked "Coming Soon")
- Stores `ub_active_course_id` in localStorage (default = COURSE_ID constant)
- Export a `useActiveCourse()` hook that returns the course ID

### New: PageHeader component

Create `src/components/PageHeader.tsx`:

- Left: personalised title prop
- Right: `<CourseSwitcher />`
- Replaces UB logo on all inner pages

### App.tsx route update

Add new route: `/anubhav-hub` → new AnubhavHub page (protected)

---

## PART 3 — Home Page Updates

### Dashboard.tsx

- Replace hero greeting subtitle with "Your journey continues. One day at a time."
- Replace header with `<PageHeader title="Namaste {firstName}!" />`
- Update stat card data sources:
  - Day Streak → `student_progress.current_streak`
  - Flames Lit → `COUNT(reflection_sessions)` where `ai_response IS NOT NULL`
  - Days Active → `student_progress.total_days_practiced`
  - My Belief Score → `AVG(confidence_rating)` from `reflection_sessions`
- Today's Lesson: find lowest `day_number` where `progress.day_complete = false`
- Daily Wisdom: pull `quote_text` + `quote_author` from active lesson

---

## PART 4 — Journey Tab Updates

### Journey.tsx

- Replace header with `<PageHeader title="{firstName}'s Journey" />`
- Replace `"weeks"` → `"course_weeks"` 
- Filter all queries by active course_id
- Keep all existing visual design

---

## PART 5 — Anubhav Tab (New Page)

### Create `src/pages/AnubhavHub.tsx`

Match existing visual language. Sections:

**Section 1 — 3 Stat Cards:**

- 🔥 Current Streak (from `student_progress`)
- 🏆 Best Streak (from `student_progress`)
- ⭐ Avg Score (`AVG(composite_score)` from `practice_sessions` where `is_best_attempt = true`)

**Section 2 — Your Progress Journey:**

- Week accordion (12 weeks × 5 days each)
- Current week auto-expanded
- Day circle states: LOCKED (grey) / AVAILABLE (white) / PRACTICED (gold + score)
- Tap practiced → bottom drawer with scores + feedback
- Tap available → navigate to practice
- Tap locked → tooltip
- Query: `progress` table for lesson_complete, `practice_sessions` for scores

**Section 3 — Personal Bests:**

- Best Session Score, Total Sessions, Total Practice Time (from `student_progress`)

---

## PART 6 — Flame Tab Redesign

### FlameRedirect.tsx → Full rewrite

Keep dark theme + gold accents.

**Header:** `<PageHeader title="{firstName}'s Flame" />`

**Section 1 — 3 Stat Cards:**

- 🔥 Current Streak (student_progress)
- 🏆 Best Streak (student_progress) 
- ⭐ My Belief Score = `AVG(confidence_rating)` from `reflection_sessions` as "X.X / 5"

**Section 2 — Confidence Journey Chart:**

- Gold line chart, X = day_number, Y = 1-5
- `SELECT day_number, MAX(confidence_rating)` grouped by day_number (no duplicates)

**Section 3 — Memory Lane:**

- Week accordion (same layout as Anubhav)
- Day states: LOCKED (anubhav_complete = false) / AVAILABLE (flame outline) / LIT (gold glow)
- Tap LIT → full-screen modal with day details, lesson title, manthan_question, written_reflection, ai_response, stars, composite_score
- Data: JOIN `reflection_sessions` with `lessons`

**Section 4 — Personal Bests:**

- Flames Lit count, Best Belief Day, Longest Streak

---

## PART 7 — Session Retry Logic Fix

### AnubhavPage.tsx (or AnubhavHub entry point)

Before starting practice, check:

```sql
SELECT COUNT(*) FROM practice_sessions
WHERE user_id = X AND course_id = Y AND status = 'complete'
AND submitted_at >= today_5_30am_ist
```

- > = 3 → show rest message (full screen, Gyani quote, nav buttons)
- < 3 → allow practice

The 5:30 AM IST cutoff calculation in JS:

```js
const now = new Date();
const istOffset = 5.5 * 60 * 60 * 1000;
const istNow = new Date(now.getTime() + istOffset);
const istDate = istNow.toISOString().split('T')[0];
// cutoff = istDate + 'T00:00:00+05:30' (i.e., 5:30 AM IST)
```

Actually implemented as a server-side query using `submitted_at` comparison.

---

## PART 8 — Streak Fix

### FlamePage.tsx — `calculateStreak` function

Replace day_number-based streak with calendar-date-based:

- Query all distinct `DATE(submitted_at AT TIME ZONE 'Asia/Kolkata')` from `practice_sessions` where `status = 'complete'`
- Walk backwards from today counting consecutive dates
- Update `student_progress.current_streak` and `longest_streak_ever`

Also update in `anubhav-evaluate` edge function (Part 10).

---

## PART 9 — Edge Function: anubhav-coach

### `supabase/functions/anubhav-coach/index.ts`

- Accept `masterName` from request body
- Fetch personality from `ai_personalities` WHERE `master_name = masterName AND context = 'anubhav'`
- Use `personality_prompt` as system message (remove hardcoded GYANI/GYANU persona text)
- Keep model as `gemini-2.5-flash-lite`

---

## PART 10 — Edge Function: anubhav-evaluate

### `supabase/functions/anubhav-evaluate/index.ts`

1. Accept `masterName` + `courseId` from body
2. Fetch personality from `ai_personalities` WHERE `master_name AND context = 'anubhav'`
3. Fetch last 5 best-attempt sessions for history context
4. Build history block in prompt
5. After saving session, UPSERT `student_progress`:
  - total_sessions_completed +1
  - total_days_practiced (COUNT DISTINCT day_numbers)
  - latest/first/best/worst scores
  - score_trend calculation
  - top_error_1/2/3 from frequency analysis
  - Calendar-based streak recalculation
  - timestamps

---

## PART 11 — Edge Function: generate-flame-response

### `supabase/functions/generate-flame-response/index.ts` — Complete rewrite

**New input:** userId, courseId, dayNumber, masterName, confidenceRating, manthanQuestion, manthanAnswer, compositeScore

**Remove:** spokeAbout, biggestChallenge, tomorrows_intention, word/smoothness/natural scores

**Processing:**

1. Fetch personality from `ai_personalities` WHERE `context = 'flame'`
2. Fetch `student_progress` row
3. Fetch last 7 sessions (practice_sessions JOIN reflection_sessions)
4. Calculate felt vs actual score gap
5. Build prompt with all context
6. UPSERT `reflection_sessions` with ai_response + composite_score

---

## PART 12 — Chart Fix (Duplicate Days)

All chart queries use `GROUP BY day_number` with `MAX()` aggregation:

- Flame confidence: `MAX(confidence_rating)` grouped by day_number
- Anubhav score: `MAX(composite_score)` grouped by day_number

Applied in FlameRedirect (new Flame tab) and AnubhavHub if charts exist.

---

## PART 13 — Progress Sanctuary Redirect

In `App.tsx`, change the `/flame` route:

- Currently renders `FlameRedirect` (Progress Sanctuary)
- After redesign, `FlameRedirect` IS the new Flame tab
- No separate redirect needed — content is replaced in-place

---

## Summary of All Files


| File                                                  | Action                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `src/components/BottomNav.tsx`                        | Edit — 5 tabs, new icons                                            |
| `src/components/CourseSwitcher.tsx`                   | Create                                                              |
| `src/components/PageHeader.tsx`                       | Create                                                              |
| `src/pages/AnubhavHub.tsx`                            | Create — new Anubhav tab                                            |
| `src/pages/Dashboard.tsx`                             | Edit — header, data sources, table renames                          |
| `src/pages/Journey.tsx`                               | Edit — header, table renames, course filter                         |
| `src/pages/FlameRedirect.tsx`                         | Full rewrite — new Flame tab                                        |
| `src/pages/FlamePage.tsx`                             | Edit — table renames, streak fix                                    |
| `src/pages/Profile.tsx`                               | Edit — header, table renames                                        |
| `src/pages/AnubhavPage.tsx`                           | Edit — table renames, retry logic                                   |
| `src/pages/DayScreen.tsx`                             | Edit — table renames                                                |
| `src/lib/userContext.ts`                              | Edit — all table renames                                            |
| `src/App.tsx`                                         | Edit — add `/anubhav-hub` route                                     |
| `supabase/functions/anubhav-coach/index.ts`           | Edit — dynamic personality                                          |
| `supabase/functions/anubhav-evaluate/index.ts`        | Edit — personality, history, student_progress upsert, table renames |
| `supabase/functions/generate-flame-response/index.ts` | Full rewrite                                                        |


No database migrations needed — all tables already exist with correct names.

---

## Implementation Order (across multiple prompts)

Due to size, this will be implemented in 3-4 sequential batches:

1. **Batch 1**: Parts 1-2 (table renames + navigation + shared components)
2. **Batch 2**: Parts 3-6 (Home, Journey, AnubhavHub, Flame tab)
3. **Batch 3**: Parts 7-11 (retry logic, streak fix, edge functions)
4. **Batch 4**: Parts 12-13 (chart fix, redirect cleanup)  
  
**You WROTE (JS comment):**  
  **// cutoff = istDate + 'T00:00:00+05:30'**  
  **// (i.e., 5:30 AM IST)  ← THIS IS WRONG**  
  
**T00:00:00+05:30 = MIDNIGHT IST**  
**NOT 5:30 AM IST.**  
**That is a 5.5 hour error in the reset window.**  
  
**WHAT THE SQL SAYS (which IS correct):**  
  **DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata')**  
  **AT TIME ZONE 'Asia/Kolkata'**  
  **+ INTERVAL '5 hours 30 minutes'**  
  
**This SQL correctly gives 5:30 AM IST. ✅**  
  
**THE RISK:**  
  **If you use the JS snippet for the**  
  **client-side check — it will reset at midnight IST**  
  **instead of 5:30 AM IST.**  
  **Students can practice at 12:01 AM instead of 5:30 AM.**  
  
**FIX: Kindlu ONLY use the SQL query**  
**for the session count check. Never the JS snippet.**  
**Server-side only. Always.**   
  
  
  **"Implement all 4 batches in sequence without**  
  **stopping. Complete all parts before I test."**  
  
