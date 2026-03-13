# UB Legendary Mega Prompt — Implementation Plan

This is a large build touching 10+ files with 22 fixes. Here is the structured plan.

## Database

`last_flame_date` and `next_day_unlock_at` already exist on `profiles`. No migration needed.

## New File

`**src/lib/constants.ts**` — Single source of truth for `PAYMENT_URL` and `COURSE_ID`. All files importing hardcoded values will switch to this.

## File Changes

### 1. `src/index.css` — Add `orbPulse` and `flameBreath` keyframes (soundwave and captureFlash already exist)

### 2. `src/pages/Onboarding.tsx`

- Fix master casing bug: line 397 writes `"Gyani"` → change to `"gyani"`, line 428 writes `"Gyanu"` → change to `"gyanu"`
- Redesign Step 3 cards: replace existing cards (lines 394-459) with new design featuring gold orb selector (top-right), simplified tag layout, and Gyanu's red "AT YOUR OWN RISK" banner
- Also update line 169 `handleFinish()` — `selectedMaster` is already written as-is, so the lowercase fix at selection point is sufficient

### 3. `src/pages/Profile.tsx`

- Normalize master on read: `const currentMaster = profile?.selected_master?.toLowerCase()`
- Replace ✅/empty-circle selection indicator with gold orb (animated `orbPulse` when selected, dim border when not)
- Import and use `PAYMENT_URL` for upgrade button (line 120)

### 4. `src/pages/AnubhavPage.tsx`

- Add `isListeningRef` for reliable mic state tracking
- Replace `startListening()` with robust version: stops previous recognition, uses `en-US`, auto-restarts on `onend` if still listening, handles `no-speech` gracefully, shows fallback on error
- Replace `stopAndCapture()` to set ref false first, accept manual input fallback
- Add cleanup `useEffect` for unmount
- Add Quick Flame section on result screen (after sentence breakdown, before buttons): 5-star rating → "Ignite My Flame 🔥" button → writes to `daily_flames` + updates streak/`last_flame_date`/`next_day_unlock_at` in `profiles`
- New state: `flameRating`, `flameSubmitted`, `submittingFlame`
- Check existing flame on result screen mount

### 5. `src/pages/FlameRedirect.tsx` — Complete rewrite → "Progress Sanctuary"

- Fetch: `profiles` (streak), `daily_flames` (all), `anubhav_sessions` (completed)
- Streak hero with animated flame
- 4 stat cards (Current Streak, Best Streak, Avg Confidence, Flames Lit)
- Confidence Journey chart using `recharts` LineChart (score % from completed sessions)
- 30-day calendar heatmap (gold dots for flame days)
- Personal Bests section (best session score, most active day, total practice time estimate)

### 6. `src/pages/Journey.tsx` — Complete rewrite → "60-Day Road Map"

- Fetch: `enrollments`, `progress`, `profiles`, `daily_flames`
- Quick stats row (Days Done, Streak, Current Day)
- 60-day tile grid (6 columns) with 6 states: Completed, Current, Unlocked, Locked (prev day), Locked (time), Locked (payment)
- Uses `PAYMENT_URL` for payment-locked tiles
- Week labels above every 5 days

### 7. `src/pages/Dashboard.tsx`

- Import `PAYMENT_URL` from constants
- Replace locked day toast (line 314) with `window.open(PAYMENT_URL, "_blank")`
- Replace locked day card overlay link similarly
- Replace `COURSE_ID` hardcoded UUID with import from constants

### 8. `src/pages/DayScreen.tsx`

- Remove streak increment from `completeDay()` (lines 233-241)
- Add day access guard on mount: check previous day's flame exists, check `next_day_unlock_at`, check payment status
- Import `PAYMENT_URL`, replace hardcoded upgrade toast (line 297)
- Replace `COURSE_ID` with import from constants

### 9. `src/pages/FlamePage.tsx`

- Add confidence rating as first screen (Screen 0, before "spoke about")
- Include `confidence_rating` in the flame write payload
- Add streak update logic after successful flame save (same calendar-based logic as AnubhavPage quick flame)
- Normalize master name on read

### 10. `supabase/functions/anubhav-coach/index.ts`

- Replace persona constants with updated versions (more practical, B1-level language)
- Replace MTI zone descriptions with simpler, more practical versions
- Add B1 language rule as first instruction in prompt
- Keep existing tool-calling structure and fallback logic

### 11. `supabase/functions/generate-flame-response/index.ts`

- Add B1 language constraint to prompt
- Add persona-aware coaching (import Gyani/Gyanu voice styles inline)

### 12. `src/App.tsx` — Add ProtectedRoute wrapper

- Create inline `ProtectedRoute` component using `supabase.auth.getSession()`
- Wrap protected routes: `/dashboard`, `/journey`, `/flame`, `/flame/:dayNumber`, `/day/:dayNumber`, `/anubhav/:dayNumber`, `/profile`
- Leave unprotected: `/`, `/auth`, `/reset-password`, `/onboarding`

## Execution Order

1. Create `src/lib/constants.ts`
2. Add CSS keyframes to `src/index.css`
3. Update edge functions (anubhav-coach, generate-flame-response)
4. Update `src/App.tsx` with ProtectedRoute
5. Update `src/pages/Onboarding.tsx` (casing fix + card redesign)
6. Update `src/pages/Profile.tsx` (gold orb + PAYMENT_URL)
7. Update `src/pages/Dashboard.tsx` (PAYMENT_URL + COURSE_ID)
8. Update `src/pages/DayScreen.tsx` (remove streak, add guard, PAYMENT_URL)
9. Update `src/pages/FlamePage.tsx` (confidence rating + streak)
10. Rewrite `src/pages/AnubhavPage.tsx` (mic fix + quick flame)
11. Rewrite `src/pages/FlameRedirect.tsx` → Progress Sanctuary
12. Rewrite `src/pages/Journey.tsx` → 60-Day Road Map  
  
**CRITICAL — Tell Lovable this before it starts:**  
  
**In src/lib/constants.ts —**  
  
**The COURSE_ID should be the ACTUAL UUID**  
**that Dashboard currently uses hardcoded.**  
**NOT the string "aarambh".**  
  
**Tell Lovable:**  
  **"In constants.ts, set COURSE_ID to the**  
   **exact UUID currently hardcoded in**  
   **Dashboard.tsx and DayScreen.tsx.**  
   **Do not change the value — just move it**  
   **to constants.ts as the source of truth."**  
  
**This prevents any DB query from breaking**  
**because the UUID changed to a slug. ✦**