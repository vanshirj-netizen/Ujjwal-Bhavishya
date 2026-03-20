

# Remaining Batches — Fix Build Errors + Complete Implementation

## Current Build Errors (Critical — Batch 1 Fix)

Three files still reference old table names, causing all the TS errors:

### File 1: `src/pages/AnubhavPage.tsx` (3 references)
- Line 182: `"anubhav_practice_sessions"` → `"practice_sessions"`
- Line 193: `"anubhav_practice_sessions"` → `"practice_sessions"`
- Line 290: `"anubhav_practice_sessions"` → `"practice_sessions"`

### File 2: `src/pages/FlamePage.tsx` (8 references)
- Line 81: `"daily_flames"` → `"reflection_sessions"`
- Line 83: `"anubhav_practice_sessions"` → `"practice_sessions"`
- Line 84: `"anubhav_writings"` → `"writing_submissions"`
- Line 146: `"daily_flames"` → `"reflection_sessions"`
- Line 210: `"daily_flames"` → `"reflection_sessions"`
- Line 220: `"daily_flames"` → `"reflection_sessions"`
- Line 271: `"daily_flames"` → `"reflection_sessions"`

### File 3: `src/pages/FlameRedirect.tsx` (2 references)
- Line 36: `"daily_flames"` → `"reflection_sessions"`
- Line 54: `"anubhav_practice_sessions"` → `"practice_sessions"`

---

## Batch 2: Edge Function Table Renames

### `supabase/functions/anubhav-evaluate/index.ts` (6 references)
- Line 84: `"anubhav_writings"` → `"writing_submissions"`
- Line 90: `"anubhav_practice_sessions"` → `"practice_sessions"`
- Line 439: `"anubhav_practice_sessions"` → `"practice_sessions"`
- Line 455: `"anubhav_practice_sessions"` → `"practice_sessions"`
- Line 462: `"anubhav_practice_sessions"` → `"practice_sessions"`
- Line 474: `"anubhav_practice_sessions"` → `"practice_sessions"`

### `supabase/functions/anubhav-coach/index.ts` — No table references to rename (uses AI gateway only)

### `supabase/functions/generate-flame-response/index.ts` — No table references to rename (uses AI gateway only)

---

## Batch 3: New Pages + Routes

### Create `src/pages/AnubhavHub.tsx`
New Anubhav tab page with:
- 3 stat cards (streak, best streak, avg score from `student_progress` + `practice_sessions`)
- Week accordion (12 weeks × 5 days) with day circles (locked/available/practiced)
- Personal bests section
- Uses `useActiveCourse()` for course filtering

### Update `src/App.tsx`
- Add route: `/anubhav-hub` → `AnubhavHub` (protected)

### Redesign `src/pages/FlameRedirect.tsx`
Full rewrite to new Flame tab with:
- `PageHeader` with `"{firstName}'s Flame"` + course switcher
- 3 stat cards (streak, best streak, belief score from `student_progress` + `reflection_sessions`)
- Confidence Journey chart (grouped by day_number, no duplicates, Y axis 1-5)
- Memory Lane accordion (week-based, day circles: locked/available/lit)
- Tap LIT day → full-screen modal with reflection details joined with lessons
- Personal bests section

---

## Batch 4: Session Retry Logic + Streak Fix + Edge Function Updates

### AnubhavPage.tsx — Retry logic
Before starting practice, count completed sessions today (server-side SQL with 5:30 AM IST cutoff). If >= 3, show rest message overlay.

### FlamePage.tsx — Streak fix
Replace `calculateStreak` function: instead of counting consecutive `day_number`, query distinct calendar dates from `practice_sessions` with `status = 'complete'`, walk backwards from today in IST.

### Edge Functions — Dynamic personality
- `anubhav-coach`: Fetch `personality_prompt` from `ai_personalities` table, remove hardcoded GYANI/GYANU persona strings
- `anubhav-evaluate`: Fetch personality, add history context (last 5 sessions), UPSERT `student_progress` after save
- `generate-flame-response`: Rewrite with new inputs (manthanQuestion, manthanAnswer, compositeScore), fetch personality, calculate felt-vs-actual gap, UPSERT `reflection_sessions`

---

## Summary of All Files Changed

| File | Action |
|------|--------|
| `src/pages/AnubhavPage.tsx` | Fix 3 table references |
| `src/pages/FlamePage.tsx` | Fix 8 table references |
| `src/pages/FlameRedirect.tsx` | Full rewrite — new Flame tab |
| `src/pages/AnubhavHub.tsx` | Create — new Anubhav tab |
| `src/App.tsx` | Add `/anubhav-hub` route |
| `supabase/functions/anubhav-evaluate/index.ts` | Fix 6 table references + add personality/history/progress upsert |
| `supabase/functions/anubhav-coach/index.ts` | Dynamic personality from DB |
| `supabase/functions/generate-flame-response/index.ts` | Full rewrite |

All 4 batches implemented in sequence without stopping.

