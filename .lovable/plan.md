

# Complete Anubhav Practice Session Overhaul

## Overview
Rebuild the practice flow from `write → speak-sentences → speak-free → evaluating → results` to `world-select → write → speak → evaluating → results`. Two files change: `AnubhavPage.tsx` (full rewrite of JSX/state) and `DayScreen.tsx` (conditional practice card on Step 6).

---

## File 1: `src/pages/DayScreen.tsx`

### Step 6 Practice Card — Conditional Display (lines 326-339)
Replace the static "Start Your Practice" GoldCard with:
- On mount of step 6, query `anubhav_practice_sessions` for completed attempts (user_id, day_number, status=complete, ordered by attempt_number desc, limit 1)
- **No completed sessions**: Show existing GoldCard unchanged
- **1-2 completed sessions**: Remove GoldCard. Show `[← Back to Home]` GoldButton + subtle text row `↺ Replay Practice · Attempt {n+1} of 3` (tappable, navigates to `/anubhav/{dayNumber}`)
- **3 completed sessions**: Same layout but text says `✓ Max practice reached for today` (not tappable)

Add a new state + useEffect inside the step 6 block (or at component level) to fetch this data.

---

## File 2: `src/pages/AnubhavPage.tsx` — Full Rebuild

### State Changes
- Phase type: `'world-select' | 'write' | 'speak' | 'evaluating' | 'results'`
- Initial phase: `'world-select'`
- New state: `selectedWorld`, `speakSentences`, `speakIndex`, `redoUsed[]`, `recordingState`, `tipSeen`, `attemptNumber`, `grammarOpen`, `exampleOpen`
- Remove: `showSentences`, `countdown`, old speak-sentences/speak-free phases

### Phase 0 — World Select
- Check `sessionStorage.getItem('anubhavWorld_day'+dayNumber)` for pre-selection
- 3 tappable GoldCards (Professional/Casual/Both) with selected/unselected border styles
- GoldButton "Start Practice →" disabled until selection made
- On confirm: save to sessionStorage, advance to `'write'`

### Phase 1 — Write (Upgraded)
- Fetch `grammar_hint, writing_prompt_instruction, write_sentence_count, write_example, writing_free_hint` from lessons (already fetched)
- Collapsible grammar reference card (open by default) with `[▼ Hide]` toggle
- `writing_prompt_instruction` with `{count}` replaced
- Input boxes with 120 char limit, numbered labels, focus border, char counter
- Collapsible example hint (closed by default)
- GoldButton disabled until all boxes have ≥5 chars
- On submit: save to `anubhav_writings`, create session, fetch attempt count, advance to `'speak'`

### Phase 2 — Speak (Fully Rebuilt)
- Fetch `practice_sentences` filtered by `selectedWorld` (professional/casual/both with interleaving)
- One-time tip card (localStorage `anubhavTipSeen`)
- Per-sentence screen: world badge pill, counter ("3 of 10"), sentence in GoldCard, circular 72px record button with idle/recording/saving states
- Post-recording: "Recorded ✓" then [🔁 Redo] (hidden if already used) + [Next →]
- Each sentence records separately via `useAudioRecorder`, uploads to storage as `{userId}/{dayNumber}/speak_{index}.{ext}`
- After last sentence: advance to `'evaluating'`

### Phase 3 — Evaluating (New Loading Screen)
- GoldCard centered with master avatar (pulsing), rotating text every 4s, 3 pulsing dots
- No back/skip buttons

### Phase 4 — Results (Upgraded)
- Star mode (day ≤ 15) vs number mode (day ≥ 16) for scores
- Section A: 3 score cards
- Section B: Writing feedback with ✅/❌ per sentence
- Section C: Word errors (max 5) with word, likely_said, what's_wrong, how_to_fix, practice_words chips
- Section D: Top 3 focus areas with error_name, explanations, practice examples
- Section E: Master's message (keep existing)
- Section F: "Complete Day N 🔥" GoldButton + flame status check (already lit → show info, not lit → navigate to flame page)
- Remove flame form inputs entirely

### Stepper Update
5 steps: 🌍 World → ✍️ Write → 🎤 Speak → ⏳ Evaluating → 🏆 Results

### Edge Function Payload Update
Add new fields to the `anubhav-evaluate` call: `speakSentences`, `selectedWorld`, `attemptNumber`, `writingPromptInstruction`, `writingPromptType`, `grammarPattern`, `mothertongue`, `childhoodstate`, `fullname`, `selectedmaster`. The edge function already accepts extra fields gracefully (they're ignored if not used in the prompt), so no edge function changes needed.

### Audio Recording Architecture
Instead of one continuous recording, each sentence is recorded individually. Use the existing `useAudioRecorder` hook per sentence. Upload each as a separate file. For the edge function, the `audio_sentences_path` will store a comma-separated list of paths (or we upload all individual files and pass a combined blob). 

**Practical approach**: Record each sentence individually for UX, but combine all blobs into a single upload before evaluation (matching the existing edge function's expectation of one `audio_sentences_path`). No free-speech recording at all — remove `audio_freespeech_path` usage.

---

## Files Changed
| File | Action |
|------|--------|
| `src/pages/AnubhavPage.tsx` | Full rewrite (same file) |
| `src/pages/DayScreen.tsx` | Edit Step 6 celebration block |

No database migrations. No edge function changes. No new components needed.

