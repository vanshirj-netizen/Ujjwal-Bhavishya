
# Legendary Polish Pass V2 — COMPLETED

## Files Changed (10 total)

1. **UPDATED** `src/index.css` — Added `.text-gradient-gold` utility class, added opacity overrides for `.text-foreground/40` (→0.60), `/50` (→0.65), `/60` (→0.72)
2. **UPDATED** `src/components/PageHeader.tsx` — Changed `title` prop from `string` to `React.ReactNode`
3. **UPDATED** `src/pages/AnubhavPage.tsx` — Reordered results: scores → master message → pronunciation drill → writing checks → hero flame CTA → back button. Removed GoldButton "Complete Day". Added gold-bordered flame hero card
4. **UPDATED** `src/pages/FlamePage.tsx` — Replaced 3-textarea reflection with Manthan flow: recap cards + manthan question + single textarea (150 chars). DB insert sends `manthan_answer` + `spoke_about` (backward compat)
5. **UPDATED** `src/pages/AnubhavHub.tsx` — Added Score Journey recharts LineChart, gold gradient on firstName
6. **UPDATED** `src/pages/Dashboard.tsx` — Greeting `text-4xl font-extrabold leading-tight`, gold gradient on firstName
7. **UPDATED** `src/pages/DayScreen.tsx` — Replaced streak display with "Day X of 60 ✓", added border to Back/Replay buttons
8. **UPDATED** `src/pages/Profile.tsx` — Replaced 4-stat grid with 3-stat (Days Done, Flames Lit, Avg Belief), removed Best Streak
9. **UPDATED** `src/pages/Journey.tsx` — Gold gradient on firstName, raised text opacities
10. **UPDATED** `src/pages/FlameHub.tsx` — Gold gradient on firstName, raised text opacities

## Edge Function Dependency Note
The Flame edge function (`generate-flame-response`) still reads `spokeAbout`, `biggestChallenge`, `tomorrowsIntention`. FlamePage now sends `spokeAbout: manthanAnswer` for backward compat, but `biggestChallenge` and `tomorrowsIntention` are no longer sent. Edge function update is out of scope for this build.
