

# Build Anubhav Practice Session Feature

## Database Migration

Create two new tables:

- **anubhav_sessions** — tracks each practice session (user, day, world type, score, completion)
- **anubhav_attempts** — tracks each sentence attempt within a session (student response, AI feedback, score)

Both with RLS policies: users can only read/write their own rows (matching `user_id`).

## Edge Function: `anubhav-coach`

New file: `supabase/functions/anubhav-coach/index.ts`

- Receives student response + sentence context (grammar pattern, MTI target, scenario, keywords, vocabulary)
- Calls Lovable AI gateway (`google/gemini-2.5-flash-lite`) with coaching prompt
- Uses tool calling to extract structured JSON: `{ feedback, score, wasCorrect, correctedSentence }`
- Fallback on parse failure: returns encouraging message with score 1
- CORS headers, `verify_jwt = false`

## New Page: `src/pages/AnubhavPage.tsx`

Route: `/anubhav/:dayNumber`

3-screen flow:

1. **World Type Selector** — Professional (💼) or Casual (😊) cards. Fetches `practice_sentences` for chosen world type + day. Creates `anubhav_sessions` row. Shows "coming soon" if 0 sentences.

2. **Practice Loop** — Shows sentence card (English + Hindi), scenario/grammar badges, difficulty dots. Student types response in textarea. Submits to `anubhav-coach` edge function. Shows feedback with score stars (0-3), corrected sentence if wrong. Saves each attempt to `anubhav_attempts`. Progress bar at top. "Next Sentence →" advances.

3. **Results Screen** — Score display (sessionScore / maxScore), star rating (1-5 based on percentage), performance message, "Practice Again" and "Back to Home" buttons. Marks session as completed.

## Route & Config Updates

- **App.tsx**: Add import + `<Route path="/anubhav/:dayNumber" element={<AnubhavPage />} />`
- **supabase/config.toml**: Add `[functions.anubhav-coach]` with `verify_jwt = false`

## Files Modified

1. SQL migration (2 new tables + RLS)
2. `supabase/functions/anubhav-coach/index.ts` (new)
3. `src/pages/AnubhavPage.tsx` (new)
4. `src/App.tsx` (route)
5. `supabase/config.toml` (edge function registration)

