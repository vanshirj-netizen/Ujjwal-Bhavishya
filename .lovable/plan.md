

# 8 Precise Fixes — Implementation Plan

## Files being changed (6 files)

1. `src/pages/DayScreen.tsx`
2. `src/pages/FlamePage.tsx`
3. `src/pages/AnubhavHub.tsx`
4. `src/pages/AnubhavPage.tsx`
5. `src/pages/Dashboard.tsx`
6. `supabase/functions/generate-flame-response/index.ts`

---

## FIX 1 — DayScreen.tsx: Set lesson_complete on lesson completion

**Where**: `completeStep()` function (line 255), specifically when step 1 is completed (the Gamma lesson iframe step).

**Problem**: `lesson_complete` is never set, so Anubhav stays locked.

**Change**: After `completeStep(1)` succeeds (the "I've Completed the Lesson ✦" button), upsert `lesson_complete: true` into the progress table. This is step 1 specifically — the Gamma lesson. The existing `completeStep` already does upsert logic for `gamma_complete`, so we add `lesson_complete: true` to the same update payload for step 1.

In `updateMap` (line 260-265), change step 1 from `{ gamma_complete: true }` to `{ gamma_complete: true, lesson_complete: true }`.

---

## FIX 2 — FlamePage.tsx: Guard enrollment increment

**Where**: `completeDay()` function (lines 349-404).

**Problem**: The enrollment increment already exists (lines 386-395), but there's no guard — revisiting a completed day will increment `current_day` again.

**Change**: Before the progress update, read `day_complete` from progress. If it was already true, skip the enrollment increment at the end. Add this check at line 354:

```
const wasAlreadyComplete = existing 
  ? (await supabase.from("progress").select("day_complete").eq("id", existing.id).single()).data?.day_complete 
  : false;
```

Then wrap the enrollment increment (lines 386-395) in `if (!wasAlreadyComplete) { ... }`.

---

## FIX 3 — AnubhavHub.tsx: Lesson gate on tiles

**Part A — Data fetch** (add to Promise.all at line 44):
Add fetch for `progress` table: `select('day_number, lesson_complete').eq('user_id', user.id)`. Store as `lessonMap` lookup.

**Part B — getDayState()** (lines 117-123):
Add new `"lesson_pending"` state. New priority order:
1. `completed` — practiceMap has day
2. `locked_payment` — free user, day > 5
3. `lesson_pending` — day ≤ currentDay AND lessonMap[day] !== true AND not completed
4. `current` — day === currentDay AND lessonMap[day] === true
5. `unlocked` — day < currentDay AND lessonMap[day] === true
6. `locked` — day > currentDay

**Part C — Tile rendering**: Add visual for `lesson_pending` (opacity 0.6, 📖 icon, "Complete lesson first"). Tap → toast + navigate to `/day/{day}`.

**Part D — handleDayTap**: Add `lesson_pending` case.

---

## FIX 4 — AnubhavPage.tsx: Server-side lesson gate

**Where**: `fetchData()` (line 112), right after `setUserId(user.id)` (line 115) and before the readonly check.

**Change**: Fetch `lesson_complete` from progress for this day. If not complete AND not readonly mode → toast + navigate to `/day/{dayNumber}` + return.

---

## FIX 5 — AnubhavPage.tsx: Retake button in results

**Where**: Results JSX (lines 1094-1134), above the existing "Back to Home" / "Back to Anubhav" buttons.

**Change**: 
- The `todaySessionsCount` state already exists and is fetched on mount. However, after completing a session, it needs to be re-counted. Add a re-fetch in the results phase or increment the count after submission.
- In results JSX (non-readonly), add above the flame CTA:
  - If `todaySessionsCount < 3`: GoldButton "🔄 Retake Session (X/3)" → `navigate('/anubhav/' + dayNumber)`
  - If `todaySessionsCount >= 3`: Disabled button "Max sessions reached today (3/3)" + "Come back tomorrow 💪" subtext

---

## FIX 6 — Dashboard.tsx: Add CourseSwitcher pill

**Where**: Header section (lines 162-176).

**Change**: Import `CourseSwitcher` component. Add it in a flex row alongside the "Namaste" heading. Wrap the heading in a `flex justify-between items-start` container, place `<CourseSwitcher />` on the right.

---

## FIX 7 — AnubhavHub.tsx: Dynamic Y-axis on chart

**Where**: YAxis component (line 183).

**Change**: Compute `minY` and `maxY` from `scoreChartData` scores with ±10 padding (clamped 0-100). Replace `domain={[0, 100]}` with `domain={[minY, maxY]}`.

---

## FIX 8 — Edge Function + FlamePage: Send recap/manthan data

**Part A — `generate-flame-response/index.ts`**: Add `recapPoint1`, `recapPoint2`, `recapPoint3` to the destructured request body (line 35). Add a "STUDENT'S MANTHAN" section to the Gemini prompt (before existing spokeAbout section) containing these 3 recap points + manthanAnswer + confidenceRating.

**Part B — `FlamePage.tsx`**: In `generateMasterResponse()` (line 239 body), add `manthanAnswer`, `recapPoint1: recapPoints[0]`, `recapPoint2: recapPoints[1]`, `recapPoint3: recapPoints[2]` to the JSON body. The state variables already exist.

Also add `manthanQuestion` and `manthanAnswer` to the payload (manthanAnswer already goes as `spokeAbout` but should also go explicitly). `recapPoints` state already exists from the lesson fetch.

---

## Build sequence
1. DayScreen.tsx (FIX 1 + FIX 6 prep)
2. FlamePage.tsx (FIX 2 + FIX 8B)
3. AnubhavHub.tsx (FIX 3 + FIX 7)
4. AnubhavPage.tsx (FIX 4 + FIX 5)
5. Dashboard.tsx (FIX 6)
6. generate-flame-response/index.ts (FIX 8A)

