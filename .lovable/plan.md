# Page Redesign + Hub Creation Plan

## Confirmation

### 8 files being touched/created:

1. **CREATE** `src/pages/AnubhavHub.tsx` — New Anubhav landing hub with 60-day grid
2. **CREATE** `src/pages/FlameHub.tsx` — New Flame landing hub with 60-day grid + chart
3. **UPDATE** `src/pages/AnubhavPage.tsx` — Add `?mode=readonly` support
4. **UPDATE** `src/pages/FlamePage.tsx` — Add `?mode=readonly` support, back button → `/flame`
5. **UPDATE** `src/App.tsx` — Add `/anubhav` and `/flame` hub routes
6. **UPDATE** `src/components/BottomNav.tsx` — Change Anubhav path from `/anubhav-hub` → `/anubhav`, active state via `startsWith`
7. **UPDATE** `src/pages/Dashboard.tsx` — Replace 4 stat cards with 3 (Days Done, Sessions, Flames Lit)
8. **UPDATE** `src/pages/Journey.tsx` — Replace 3 stat cards with new 3 (Completed, You Are Here, Days Left), add 🔥 icon to completed tiles

### 2 new routes:

- `/anubhav` → `AnubhavHub` (protected)
- `/flame` → `FlameHub` (protected, replaces current FlameRedirect at `/flame`)

### BottomNav changes:

- Anubhav tab: path `/anubhav-hub` → `/anubhav`
- Flame tab: path `/flame` stays same (but now hits FlameHub instead of FlameRedirect)
- Active detection: already uses `startsWith`, just needs path update for Anubhav

### Data fetches:

- **AnubhavHub**: practice_sessions (grouped by day_number), reflection_sessions (day_numbers), enrollments (current_day, payment_status), course_weeks, profiles
- **FlameHub**: reflection_sessions (day_number + confidence_rating), progress (anubhav_complete), enrollments, course_weeks, profiles, student_progress (streaks)

---

## Build Sequence

### 1. `src/components/BottomNav.tsx`

- Change Anubhav path: `/anubhav-hub` → `/anubhav`

### 2. `src/pages/AnubhavHub.tsx` (CREATE)

- PageHeader with `{firstName}'s Anubhav` + course switcher
- 3 GoldCard stats: Days Practiced (distinct day_number count), Total Sessions (count), Avg Score (avg of best attempts)
- SectionLabel "YOUR ANUBHAV JOURNEY"
- 60-day grid (12 weeks × 5 days) with week labels from course_weeks
- 5 tile states: completed (gold border + score + 🔥 if flame exists), today (pulse), unlocked, locked-payment, locked
- Tap completed → `/anubhav/{day}?mode=readonly`, tap today/unlocked → `/anubhav/{day}`, tap locked-payment → PAYMENT_URL
- Data: Promise.all for profiles, enrollments, practice_sessions, reflection_sessions, course_weeks

### 3. `src/pages/FlameHub.tsx` (CREATE)

- PageHeader with `{firstName}'s Flame` + course switcher
- 3 GoldCard stats: Today (current_day), Flames Lit (count), Avg Belief (avg confidence_rating as X.X/5)
- Confidence Journey chart (copied from FlameRedirect, LineChart with recharts)
- SectionLabel "{firstName}'s Memory Lane ✦"
- 60-day grid with 4 tile states: flame-complete (gold + stars), anubhav-done-flame-pending (amber pulse), today, locked
- Tap lit → `/flame/{day}?mode=readonly`, tap available → `/flame/{day}`
- Data: Promise.all for profiles, enrollments, reflection_sessions, progress, course_weeks

### 4. `src/pages/AnubhavPage.tsx`

- At top of fetchData: check `searchParams.get('mode') === 'readonly'`
- If readonly: fetch best attempt from practice_sessions (is_best_attempt=true), set results state, set phase='results', skip all other phases
- In results screen when readonly: show pill badge "Day X • Best Session • {date}", replace action buttons with "Back to Anubhav" → `/anubhav`
- No changes to practice flow

### 5. `src/pages/FlamePage.tsx`

- At top of fetchData: check `searchParams.get('mode') === 'readonly'`
- If readonly and existing flame found: set screen='readonly' directly, skip gate/reflection
- In readonly screen: change "Back to Home" → "Back to Flame" navigating to `/flame`

### 6. `src/App.tsx`

- Import AnubhavHub, FlameHub
- Add routes: `/anubhav` → AnubhavHub, `/flame` → FlameHub (both protected)
- Remove `/anubhav-hub` route (replaced by `/anubhav`)
- Remove FlameRedirect import and its `/flame` route (replaced by FlameHub)
- Keep `/anubhav/:dayNumber` and `/flame/:dayNumber` routes unchanged

### 7. `src/pages/Dashboard.tsx`

- Replace 4-column stat grid with 3-column
- Card 1: ✅ Days Done — COUNT from progress WHERE day_complete=true
- Card 2: 🎙️ Sessions — COUNT from practice_sessions WHERE status='complete'
- Card 3: 🔥 Flames Lit — COUNT from reflection_sessions
- Remove streak, days active, belief states and queries

### 8. `src/pages/Journey.tsx`

- Replace 3 stat cards: ✅ Completed (daysCompleted), 📍 You Are Here (Day X), ⏳ Days Left (60 - daysCompleted)
- Remove streak state/query
- Add 🔥 icon (10px, bottom-right absolute) on completed day tiles where flameMap[day] exists — already partially there at bottom-left, move to bottom-right per spec

---

## Technical Notes

- Both hub pages follow Journey.tsx patterns exactly: same GoldCard stats, same grid layout (grid-cols-6), same week labels from course_weeks, same motion animations
- FlameRedirect.tsx becomes unused after FlameHub replaces it — will be removed from routes but file kept (no file deletion requested)
- `useSearchParams` from react-router-dom will be used for readonly mode detection
- All queries use `COURSE_ID` from constants for course filtering  
  
Before you build, two corrections to the plan:
  CORRECTION 1 — FlameHub data:
  Remove student_progress from FlameHub fetches entirely.
  No streak data anywhere on FlameHub.
  The 3 cards need only:
    enrollments (current_day)
    reflection_sessions (count + avg confidence_rating)
  Nothing else.
  CORRECTION 2 — Memory Lane section:
  Add subtitle below the Memory Lane title:
    Title: "{firstName}'s Memory Lane ✦"
    Subtitle: "Your reflections. Your journey. Your story."
    Subtitle style: smaller font, faded opacity, 
    same as Journey page section description text.
  Also confirm: Does FlameRedirect.tsx contain any 
  auth or enrollment logic beyond redirecting to 
  /flame/:dayNumber? If yes — that logic must move 
  into FlameHub before FlameRedirect is removed.
  After confirming these 3 points — proceed to build.
    
  Remove FlameRedirect import and its /flame route
  (replaced by FlameHub)

  **Tell me :** Does FlameRedirect currently do anything that FlameHub doesn't replace? If FlameRedirect was just a redirect to `/flame/:currentDay` — then FlameHub replaces it completely and removal is correct.
  If it had any other logic (auth check, enrollment check) — those need to move into FlameHub. Worth a quick check of FlameRedirect.tsx before building.  
    
  Re-write the plan again and suggest the everything before proceeding.  
