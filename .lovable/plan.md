# Legendary Polish Pass V2 — Plan

## Files being touched (8 files)

1. `src/pages/AnubhavPage.tsx` — Fix 1: Results screen reorder + hero flame CTA
2. `src/pages/FlamePage.tsx` — Fix 2: Manthan reflection flow
3. `src/pages/AnubhavHub.tsx` — Fix 3: Add Score Journey chart
4. `src/index.css` — Fix 4 + Fix 7: Gold gradient class + opacity overrides
5. `src/pages/Dashboard.tsx` — Fix 5: Greeting typography
6. `src/pages/DayScreen.tsx` — Fix 6: Remove streak, fix button borders
7. `src/pages/Profile.tsx` — Fix 8: Replace Best Streak with Avg Belief
8. `src/components/PageHeader.tsx` — Fix 4: Change title prop from `string` to `ReactNode` to support gold gradient spans

## Confirmations

### Manthan flow (Fix 2)

The current reflection screen in FlamePage has 3 textareas (spoke about, biggest challenge, tomorrow's intention) + star rating. This gets replaced with:

- Section A: "Today You Learned" — 3 recap point cards fetched from `lessons` table
- Section B: "Your Manthan" — manthan_question displayed as prompt + single textarea (manthanAnswer, 150 chars)
- Section C: "How Confident" — existing 5-star rating (unchanged)
- Continue button disabled when `manthanAnswer.trim().length === 0 || confRating === 0`
- DB insert: `manthan_answer: manthanAnswer`, `spoke_about: manthanAnswer` (backward compat), remove biggestChallenge/tomorrowsIntention from insert
- reflectionValid simplified accordingly

### Gold gradient class (Fix 4)

Adding `.text-gradient-gold` to `src/index.css` in `@layer utilities`. PageHeader must accept `ReactNode` (not just string) so pages can pass `<>{goldSpan} Journey</>`. Each page builds its title JSX inline.

### Score Journey chart (Fix 3)

No new DB query needed — data already fetched in `sessionsRes`. Compute `scoreChartData` from `practiceMap` entries, add recharts `LineChart` between stats and section label. Import `recharts` (already used in FlameHub).

---

## Build sequence

### 1. `src/index.css`

- Add `.text-gradient-gold` class in `@layer utilities`
- Add opacity overrides for `.text-foreground\/40`, `/50`, `/60`

### 2. `src/components/PageHeader.tsx`

- Change `title: string` → `title: React.ReactNode`

### 3. `src/pages/Dashboard.tsx`

- Change greeting to `text-4xl font-extrabold leading-tight`
- Pass title as ReactNode with gold gradient on firstName: `<>Namaste <span className="text-gradient-gold">{firstName || "Friend"}</span>!</>`

### 4. `src/pages/AnubhavHub.tsx`

- Gold gradient on firstName in title
- Add `scoreChartData` state, compute from `pMap`
- Add recharts chart card between stats and section label (same style as FlameHub)

### 5. `src/pages/AnubhavPage.tsx` (results section only, lines 931-1122)

- Reorder: scores → master message → pronunciation drill → writing checks → hero flame CTA → back button
- Remove "Complete Day X 🔥" GoldButton
- Add hero flame card (gold border, 🔥 emoji, "Go Light Your Flame") when `!flameExists`, show "already lit" when `flameExists`
- Add border to "Back to Home" GlassButton

### 6. `src/pages/FlamePage.tsx` (reflection screen, lines 507-569)

- Add lesson fetch for `recap_point_1, recap_point_2, recap_point_3, manthan_question` (add to existing Promise.all)
- Add states: `recapPoints`, `manthanQuestion`, `manthanAnswer`
- Replace 3-textarea reflection with: recap cards → manthan prompt + textarea → star rating
- Update reflectionValid: `manthanAnswer.trim().length > 0 && confRating > 0`
- Update DB insert: add `manthan_answer`, keep `spoke_about: manthanAnswer`, remove `biggest_challenge`, `tomorrows_intention`
- Gold gradient on firstName in FlameHub title

### 7. `src/pages/DayScreen.tsx` (step 6 completion, lines 378-461)

- Replace streak display (🔥 + currentStreak + "day streak") with "Day {dayNumber} of 60 ✓" in `text-sm text-foreground/60`
- Add `border: 1px solid rgba(255,252,239,0.15)` to "Back to Home" and "Replay Day" GlassButtons

### 8. `src/pages/Profile.tsx` (stats grid, lines 160-176)

- Change from 4-stat `grid-cols-2` to 3-stat `grid-cols-3`
- Remove "Best Streak" (remove `bestStreak` state and `longest_streak` query)
- Add "Avg Belief" card with 💬 icon using existing `avgConfidence` value formatted as "X.X / 5"

### 9. Inline rgba text opacity changes (Fix 7)

Across all touched files, change TEXT-only rgba opacities:

- `rgba(255,252,239,0.3)` on text → `0.55`
- `rgba(255,252,239,0.4)` on text → `0.65`
- `rgba(255,252,239,0.5)` on text → `0.68`
- Do NOT change border/background rgba values

### 10. Additional pages for gold gradient (Fix 4)

- `Journey.tsx`: wrap firstName in gold gradient span in PageHeader title
- `FlameHub.tsx`: wrap firstName in gold gradient span
- `Profile.tsx`: wrap firstName in gold gradient span  
  
Two corrections before you build:
  CORRECTION 1 — Files list incomplete:
  Add these 2 files to the build scope:
    - src/pages/Journey.tsx (gold gradient on firstName)
    - src/pages/FlameHub.tsx (gold gradient on firstName)
  These are mentioned in your Step 10 but missing from 
  the 8-files list. Please confirm total = 10 files.
  CORRECTION 2 — Flame edge function not in scope:
  The FlamePage.tsx changes save manthan_answer to DB.
  But the Flame Gemini edge function still reads the 
  old 3 fields (spoke_about, biggest_challenge, 
  tomorrows_intention).
  This edge function update is NOT part of this 
  Lovable build — we'll update it separately in 
  Supabase dashboard (zero credits).
  BUT: confirm you understand this dependency exists
  so you don't accidentally reference the old fields
  anywhere in the FlamePage code going forward.
  After these 2 confirmations — proceed to build.
  &nbsp;