# Audit Results & Fix Plan

## Route Audit

- `/` → **Splash** (loader, checks auth state)
- `/dashboard` → **Dashboard** ← this is **TRUE_HOME**
- `/onboarding` → Onboarding
- Onboarding final step already navigates to `/dashboard` ✅

## Fix 1 — DayScreen.tsx: Resume Logic Guard

**Lines 158-168**: The resume logic has no guard for "no progress" vs "day complete" — a fresh Day 2 with zero progress rows falls through without setting step 1 explicitly (though defaults handle it, the structure is fragile). Replace with explicit 3-branch guard:

- `progressData && !day_complete` → resume from last step
- `progressData?.day_complete` → step 6 with all steps done
- else → fresh start, step 1, empty completedSteps

`completeDay()` line 212 already correctly sets `current_day: nextDay` and `days_completed: Number(dayNumber)` — no change needed there.

## Fix 2 — DayScreen.tsx: All `navigate("/")` → `navigate("/dashboard")`

4 broken instances:

- Line 244: Free tier "Back to Home" button
- Line 272: Step 6 "🏠 Home" button
- Line 313: Step 6 "← Back to Home" button  
- Line 427: Header "← Back" button

All go to Splash instead of Dashboard. Change all to `navigate("/dashboard")`.

## Fix 3 — App.tsx: Flame placeholder `href`

Line 32: `href="/"` → `href="/dashboard"`

## Fix 4 — NotFound.tsx: Home link

Line 16: `href="/"` → `href="/dashboard"`

## No changes needed

- **Onboarding.tsx**: Already navigates to `/dashboard` ✅
- **Splash.tsx**: Correctly routes to `/dashboard` or `/onboarding` ✅
- **FlameRedirect.tsx**: Already uses `navigate("/dashboard")` ✅

## Files to modify

1. `src/pages/DayScreen.tsx` — 5 edits (resume guard + 4 navigate calls)
2. `src/App.tsx` — 1 edit (flame href)
3. `src/pages/NotFound.tsx` — 1 edit (home href)  
  
  
ADD FIX 5 to the prompt:
  ═══════════════════════════════════════════
  FIX 5 — Dashboard.tsx
  Streak + current_day shows Day 0
  ═══════════════════════════════════════════
  CAUSE: Dashboard fetches enrollment
  and profile data once on mount.
  After DayScreen completes a day and
  navigates to /dashboard, the data
  is stale — no refetch on focus.
  ADD these two things:
  THING 1 — Refetch on route focus:
  Add this to the dashboard data
  fetch useEffect:
    import { useLocation } from
      "react-router-dom";
    const location = useLocation();
    Change the useEffect dependency
    from [] to [location.key]:
    useEffect(() => {
      fetchDashboardData();
    }, [location.key]);
    This triggers a fresh fetch EVERY
    TIME the user navigates to /dashboard
    — including after completing a day. ✦
  THING 2 — Verify streak display:
  Find where current_streak is shown
  on the Dashboard.
  Make sure it reads from:
    profileData?.current_streak
    NOT from enrollmentData
  They are different tables.
  Streak lives in profiles.
  current_day lives in enrollments. ✦
  Also verify the day card reads:
    enrollment?.current_day
    NOT a hardcoded value
    NOT a stale state variable
  If the Dashboard day card has
  any hardcoded "Day 1" or "Day 0"
  text — replace with:
    enrollment?.current_day ?? 1
  &nbsp;