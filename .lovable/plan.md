

# 6 UI Fixes — Implementation Plan

## Files to change (3 files)
1. `src/pages/FlamePage.tsx` (Changes 5 & 6)
2. `src/pages/AnubhavPage.tsx` (Changes 1 & 2)
3. `src/pages/AnubhavHub.tsx` (Changes 3 & 4)

---

## Group 1 — Flame Fixes

### Change 5: Remove pronunciation scores from Flame readonly
**Where**: FlamePage.tsx lines 474-489 — the `practiceSession &&` block rendering 3 score cards.
**Action**: Delete this entire block. No pronunciation or writing scores on Flame.

### Change 6: Fix Flame readonly question label
**Where**: FlamePage.tsx lines 461-472 — the hardcoded 3-card layout.
**Action**: Replace with conditional logic:
- If `lesson?.manthan_question` is not null: show ONE card with `lesson.manthan_question` as label, `existingFlame.manthan_answer || existingFlame.spoke_about` as content
- If `lesson?.manthan_question` is null (old session): show the existing 3-card layout (spoke_about, biggest_challenge, tomorrows_intention) filtering out null values

The `lesson` state already contains `manthan_question` from the fetch at line 89. The `existingFlame` has `manthan_answer`.

---

## Group 2 — Anubhav Results

### Change 1: Writing score card
**Where**: AnubhavPage.tsx lines 960-984 — the 3 score cards grid.
**Action**:
- After fetching bestAttempt in readonly mode (line 142), also include `writing_composite_score` in results (already fetched via `select("*")`)
- Add results mapping: `writingCompositeScore: bestAttempt.writing_composite_score`
- After the existing 3-card grid, conditionally render a 4th card IF `results.writingCompositeScore != null`:
  - Label: "WRITING"
  - Border: cream `#FFFCEF` (use a custom style instead of GoldCard's gold gradient)
  - Stars vs number: same `isStarMode` logic (day 1-15 stars, 16+ number/100)
- If null: no card rendered at all

### Change 2: Writing Check section
**Where**: AnubhavPage.tsx — currently there's already a "YOUR WRITING" section (lines 1060-1108) using `writingChecks`.
**Action**: Update the existing section:
- Rename header from "YOUR WRITING" to "WRITING CHECK"
- Update the check logic to use `isCorrect` boolean (new schema) instead of `!wc.issue`
- For correct items: show `✅ "[sentence]"` — clean single line
- For incorrect items: show `❌ "[sentence]"`, then "ISSUE: [issue]", then "FIX: [correctedVersion]" in gold/cream
- The section already hides when writingChecks is empty/null — keep that behavior

The existing code at lines 1060-1108 already handles this partially but uses `!wc.issue` for the check. Update to use `wc.isCorrect` and add `correctedVersion` display.

---

## Group 3 — Anubhav Hub

### Change 3: Split Avg Score into Speaking + Writing
**Where**: AnubhavHub.tsx lines 34-37 (state) and lines 95-103 (avg computation) and lines 168-185 (stats grid).
**Action**:
- Add state: `avgSpeaking` and `avgWriting` (strings, default "–")
- In data fetch, update bestAttemptsRes query to also select `writing_composite_score`
- Compute `avgSpeaking` from `composite_score` values (existing logic)
- Compute `avgWriting` from `writing_composite_score` values where non-null
- `hasWritingScores` boolean = any session has writing_composite_score
- Stats grid:
  - If no writing scores: show original 3 cards `[Days Practiced] [Total Sessions] [Avg Score]` (grid-cols-3)
  - If writing scores exist: show 4 cards `[🎙️ Days Practiced] [🔁 Total Sessions] [🎤 Avg Speaking] [✍ Avg Writing]` using `grid-cols-2 sm:grid-cols-4` for mobile-safe layout

### Change 4: Second line on Score Journey chart
**Where**: AnubhavHub.tsx lines 85-93 (chart data) and lines 191-204 (chart JSX).
**Action**:
- Update sessionsRes query (line 48) to also select `writing_composite_score`
- When building chart data, also compute `writingScore` per day (max writing_composite_score per day, only where non-null)
- Chart data items become: `{ name, score, writingScore? }`
- Add second `<Line>` for writing: stroke="#FFFCEF", only renders points where `writingScore` exists
- Use `connectNulls={false}` so cream line gaps over null days
- Add legend below chart (small text): 🎤 Speaking [gold] ✍ Writing [cream] — only if any writing data exists
- Import `Legend` is not needed — use a simple custom div below the chart

---

## Technical Details

- `writing_composite_score` already exists in `practice_sessions` schema (confirmed in types.ts)
- `manthan_question` comes from `lessons` table, already fetched in FlamePage
- `manthan_answer` is stored in `reflection_sessions`, already loaded into `existingFlame`
- `writingChecks` with `isCorrect`/`correctedVersion` fields come from the updated edge function schema
- No database migrations needed
- No edge function changes

