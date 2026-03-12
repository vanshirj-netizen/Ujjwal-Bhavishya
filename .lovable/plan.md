

# Master Consolidated Build — 5 Files

## Overview

Complete redesign of the Anubhav practice flow (speak all 10 silently → 1 Gemini call → results), updated master persona cards in onboarding and profile, plus soundwave CSS animations.

## File 1: `src/index.css`
Add soundwave keyframes and capture-flash animation at the bottom. No removals.

## File 2: `src/pages/Onboarding.tsx` (lines 388-438)
Replace the Step 3 master selection section. Replace the 2-column image grid with full-width stacked cards:
- **Gyani card**: emoji avatar (🧙‍♂️), tags (Warm, Patient, Foundation-first), description quote
- **Gyanu card**: "AT YOUR OWN RISK" banner at top, emoji avatar (🔥), tags (No shortcuts, Hacks not textbooks, Tough love), description quote
- Keep the "I Choose..." continue button

## File 3: `src/pages/Profile.tsx` (lines 240-317)
Replace the Preferences section. Remove the master modal (lines 330-373). Instead, inline "Your Master" section with two compact cards (Gyani/Gyanu with radio-style selection + Gyanu risk banner). Add "Update My Master →" button that only shows when selection differs from saved value. Keep existing World, WhatsApp, and Background sections below.

## File 4: `src/pages/AnubhavPage.tsx` — Full rewrite
New 4-screen flow:
- **State**: Remove per-sentence feedback states. Add `responses[]`, `sessionResult`, `captured`, `manualInput`, `fallbackVisible`.
- **startListening**: `continuous=true`, `interimResults=false`, accumulates into `responseRef`
- **stopAndCapture**: Saves response silently, shows "✅ Got it!" flash for 900ms, auto-advances. On last sentence → `evaluateSession()`
- **evaluateSession**: Sets screen to "evaluating", sends ALL sentences + responses in one call to `anubhav-coach`, saves session + all attempts on success, then screen → "result"
- **Practice screen**: Sentence card + scenario/grammar badges + soundwave mic button (5 animated bars, NO animate-pulse) + "Can't use mic?" fallback textarea
- **Evaluating screen**: Large master avatar with breathing animation, "Gyani is reviewing..." text, 3-dot loader
- **Result screen**: Score card with stars, overall feedback, per-sentence breakdown (target vs spoken, correction if wrong), Practice Again + Back to Home buttons
- Remove `speakFeedback`, `submitResponse`, `nextSentence`, per-sentence feedback UI

## File 5: `supabase/functions/anubhav-coach/index.ts` — Complete rewrite
- New request body: accepts `sentences[]` array (all 10 at once)
- `GYANI_PERSONA` and `GYANU_PERSONA` constants with full character voice definitions
- `MTI_ZONE_CONTEXT` map (7 zones: hindi_heartland, punjabi_northwest, marathi_gujarati, bengali_odia, dravidian_south, northeast, urban_neutral)
- Single Gemini call (gemini-2.5-flash-lite) with consolidated prompt evaluating all sentences
- Uses tool-calling to return structured JSON: `{ totalScore, overallFeedback, sentenceResults[] }`
- Fallback on parse failure returns score=1 for each sentence with generic feedback

## API calls reduction
Before: 10 Gemini + 10 ElevenLabs = 20 calls per session
After: 1 Gemini call total

